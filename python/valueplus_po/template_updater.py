import html
import os
import re
import shutil
import tempfile
import zipfile

from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"


class TemplateUpdateError(ValueError):
    pass


def add_template_products(template_path, products):
    path = Path(template_path)
    if not path.is_file():
        raise TemplateUpdateError(f"ไม่พบไฟล์ Excel Template: {path}")
    clean_products = [_validate_product(item) for item in products]
    if not clean_products:
        raise TemplateUpdateError("ไม่พบสินค้าที่ต้องการเพิ่ม")

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    backup = path.with_name(f"{path.stem}.backup-{timestamp}{path.suffix}")
    temporary = Path(tempfile.mkstemp(suffix=".xlsx", dir=path.parent)[1])

    try:
        shutil.copy2(path, backup)
        with zipfile.ZipFile(path, "r") as source:
            parts = {info.filename: source.read(info.filename) for info in source.infolist()}
            infos = source.infolist()
            sheet_parts = _resolve_sheet_parts(source)
            shared_strings = _read_shared_strings(source)

        data_name = next((name for name in sheet_parts if name.strip().casefold() == "data"), None)
        if not data_name:
            raise TemplateUpdateError("ไม่พบชีต Data ใน Excel Template")

        destination_sheets = [name for name in sheet_parts if name != data_name]
        for product in clean_products:
            data_part = sheet_parts[data_name]
            data_xml = parts[data_part].decode("utf-8")
            parts[data_part] = _upsert_data_product(
                data_xml,
                product,
                shared_strings,
            ).encode("utf-8")

            for sheet_name in destination_sheets:
                part = sheet_parts[sheet_name]
                xml_text = parts[part].decode("utf-8")
                if _sheet_has_product(xml_text, product["name"], shared_strings, column="B"):
                    continue
                total_row = _find_total_row(xml_text, shared_strings)
                if total_row is None:
                    raise TemplateUpdateError(
                        f"ไม่พบแถว ยอดรวมสินค้า ในชีต {sheet_name}"
                    )
                parts[part] = _insert_destination_product(
                    xml_text,
                    product,
                    shared_strings,
                ).encode("utf-8")
                parts["xl/workbook.xml"] = _shift_defined_names_for_sheet(
                    parts["xl/workbook.xml"].decode("utf-8"),
                    sheet_name,
                    total_row,
                ).encode("utf-8")

        parts["xl/workbook.xml"] = _force_recalculation(
            parts["xl/workbook.xml"].decode("utf-8")
        ).encode("utf-8")

        with zipfile.ZipFile(temporary, "w") as output:
            for info in infos:
                output.writestr(info, parts[info.filename])

        _validate_package(temporary)
        os.replace(temporary, path)
        return {
            "backup_path": str(backup.resolve()),
            "template_path": str(path.resolve()),
            "product_count": len(clean_products),
            "sheet_count": len(destination_sheets),
        }
    except PermissionError as error:
        raise TemplateUpdateError(
            "ไม่สามารถแก้ไข Template ได้ กรุณาปิดไฟล์ใน Excel แล้วลองใหม่"
        ) from error
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def _validate_product(item):
    name = str(item.get("name", "")).strip()
    code = str(
        item.get(
            "product_code",
            item.get("productCode", ""),
        )
    ).strip()
    try:
        pack_quantity = float(
            item.get(
                "pack_quantity",
                item.get("packQuantity"),
            )
        )
    except (TypeError, ValueError) as error:
        raise TemplateUpdateError("จำนวนบรรจุต้องเป็นตัวเลขมากกว่า 0") from error
    if not name:
        raise TemplateUpdateError("กรุณาระบุชื่อสินค้า")
    if not code:
        raise TemplateUpdateError("กรุณาระบุรหัสสินค้า")
    if not pack_quantity > 0:
        raise TemplateUpdateError("จำนวนบรรจุต้องมากกว่า 0")
    return {"name": name, "product_code": code, "pack_quantity": pack_quantity}


def _resolve_sheet_parts(source):
    workbook_root = ElementTree.fromstring(source.read("xl/workbook.xml"))
    rels_root = ElementTree.fromstring(source.read("xl/_rels/workbook.xml.rels"))
    targets = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels_root.findall(f"{{{PACKAGE_REL_NS}}}Relationship")
    }
    result = {}
    for sheet in workbook_root.findall(f".//{{{MAIN_NS}}}sheet"):
        target = targets[sheet.attrib[f"{{{OFFICE_REL_NS}}}id"]].replace("\\", "/")
        if target.startswith("/"):
            target = target.lstrip("/")
        elif not target.startswith("xl/"):
            target = f"xl/{target}"
        result[sheet.attrib["name"]] = target
    return result


def _read_shared_strings(source):
    if "xl/sharedStrings.xml" not in source.namelist():
        return []
    root = ElementTree.fromstring(source.read("xl/sharedStrings.xml"))
    values = []
    for item in root.findall(f"{{{MAIN_NS}}}si"):
        values.append("".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t")))
    return values


def _normalize(value):
    return re.sub(r"\s+", "", str(value or "")).casefold()


def _sheet_has_product(xml_text, product_name, shared_strings, column):
    wanted = _normalize(product_name)
    for row_match in re.finditer(r"<row\b[^>]*>.*?</row>", xml_text, re.DOTALL):
        cell = _find_cell(row_match.group(0), column)
        if cell and _normalize(_cell_text(cell, shared_strings)) == wanted:
            return True
    return False


def _cell_text(cell_xml, shared_strings):
    cell_type = re.search(r'\bt="([^"]+)"', cell_xml)
    if cell_type and cell_type.group(1) == "inlineStr":
        return html.unescape(
            "".join(
                re.findall(
                    r"<t\b[^>]*>(.*?)</t>",
                    cell_xml,
                    re.DOTALL,
                )
            )
        )
    value = re.search(r"<v>(.*?)</v>", cell_xml, re.DOTALL)
    if not value:
        return ""
    raw = value.group(1)
    if cell_type and cell_type.group(1) == "s":
        try:
            return shared_strings[int(raw)]
        except (ValueError, IndexError):
            return ""
    return raw


def _find_cell(row_xml, column):
    match = re.search(
        rf'<c\b[^>]*\br="{re.escape(column)}\d+"[^>]*(?:/>|>.*?</c>)',
        row_xml,
        re.DOTALL,
    )
    return match.group(0) if match else None


def _upsert_data_product(xml_text, product, shared_strings):
    matching_name_row = None
    matching_code_row = None
    for match in re.finditer(
        r"<row\b[^>]*\br=\"(\d+)\"[^>]*>.*?</row>",
        xml_text,
        re.DOTALL,
    ):
        row_xml = match.group(0)
        name_cell = _find_cell(row_xml, "E")
        code_cell = _find_cell(row_xml, "D")
        if (
            name_cell
            and _normalize(_cell_text(name_cell, shared_strings))
            == _normalize(product["name"])
        ):
            matching_name_row = match
        if (
            code_cell
            and _normalize(_cell_text(code_cell, shared_strings))
            == _normalize(product["product_code"])
        ):
            matching_code_row = match

    matching = matching_code_row or matching_name_row
    if matching:
        row_number = int(matching.group(1))
        row_xml = matching.group(0)
        row_xml = _set_row_cell(
            row_xml, "D", row_number, product["product_code"], "inline"
        )
        if matching_code_row:
            row_xml = _set_row_cell(row_xml, "E", row_number, product["name"], "inline")
            row_xml = _set_row_cell(
                row_xml, "F", row_number, product["pack_quantity"], "number"
            )
        return xml_text[:matching.start()] + row_xml + xml_text[matching.end():]

    rows = list(re.finditer(r"<row\b[^>]*\br=\"(\d+)\"[^>]*>.*?</row>", xml_text, re.DOTALL))
    if not rows:
        raise TemplateUpdateError("ไม่พบแถวข้อมูลในชีต Data")
    last = rows[-1]
    new_row = int(last.group(1)) + 1
    row_xml = _shift_row_xml(last.group(0), new_row)
    row_xml = _set_row_cell(row_xml, "D", new_row, product["product_code"], "inline")
    row_xml = _set_row_cell(row_xml, "E", new_row, product["name"], "inline")
    row_xml = _set_row_cell(row_xml, "F", new_row, product["pack_quantity"], "number")
    row_xml = _set_row_cell(row_xml, "G", new_row, "ชิ้น", "inline")
    xml_text = xml_text[:last.end()] + row_xml + xml_text[last.end():]
    return _expand_dimension(xml_text, new_row)


def _insert_destination_product(xml_text, product, shared_strings):
    total_row = _find_total_row(xml_text, shared_strings)
    if total_row is None:
        raise TemplateUpdateError("ไม่พบแถว ยอดรวมสินค้า ในชีตปลายทาง")
    previous = _row_match(xml_text, total_row - 1)
    if previous is None:
        raise TemplateUpdateError("ไม่พบแถวสินค้าต้นแบบก่อนแถวรวม")

    start = xml_text.index("<sheetData")
    start = xml_text.index(">", start) + 1
    end = xml_text.index("</sheetData>", start)
    prefix, sheet_data, suffix = xml_text[:start], xml_text[start:end], xml_text[end:]

    sheet_data = re.sub(
        r"<row\b[^>]*\br=\"(\d+)\"[^>]*>.*?</row>",
        lambda match: _shift_row_xml(match.group(0), int(match.group(1)) + 1)
        if int(match.group(1)) >= total_row else match.group(0),
        sheet_data,
        flags=re.DOTALL,
    )

    new_product = _shift_row_xml(previous.group(0), total_row)
    sequence = _last_product_sequence(previous.group(0)) + 1
    new_product = _set_row_cell(new_product, "A", total_row, sequence, "number")
    new_product = _set_row_cell(new_product, "B", total_row, product["name"], "inline")
    new_product = _set_row_cell(
        new_product,
        "C",
        total_row,
        f"SUMIF(Data!E:E,B{total_row},Data!F:F)",
        "formula",
    )
    new_product = _set_row_cell(new_product, "D", total_row, None, "blank")
    new_product = _set_row_cell(new_product, "E", total_row, "ชิ้น", "inline")

    shifted_total = _row_match_from_text(sheet_data, total_row + 1)
    if shifted_total is None:
        raise TemplateUpdateError("เลื่อนแถวรวมสินค้าไม่สำเร็จ")
    updated_total = _set_row_cell(
        shifted_total.group(0), "D", total_row + 1, f"SUM(D8:D{total_row})", "formula"
    )
    sheet_data = sheet_data[:shifted_total.start()] + updated_total + sheet_data[shifted_total.end():]
    insertion = _row_match_from_text(sheet_data, total_row + 1)
    sheet_data = sheet_data[:insertion.start()] + new_product + sheet_data[insertion.start():]

    prefix = _shift_range_attributes(prefix, total_row)
    suffix = _shift_range_attributes(suffix, total_row)
    suffix = _shift_sqref_text(suffix, total_row)
    return prefix + sheet_data + suffix


def _find_total_row(xml_text, shared_strings):
    for match in re.finditer(r"<row\b[^>]*\br=\"(\d+)\"[^>]*>.*?</row>", xml_text, re.DOTALL):
        for column in ("A", "B", "C", "D", "E"):
            cell = _find_cell(match.group(0), column)
            if cell and "ยอดรวมสินค้า" in _normalize(_cell_text(cell, shared_strings)):
                return int(match.group(1))
    return None


def _row_match(xml_text, row):
    return re.search(rf"<row\b[^>]*\br=\"{row}\"[^>]*>.*?</row>", xml_text, re.DOTALL)


def _row_match_from_text(xml_text, row):
    return _row_match(xml_text, row)


def _shift_row_xml(row_xml, target_row):
    row_xml = re.sub(r'(<row\b[^>]*\br=")\d+(\")', rf"\g<1>{target_row}\2", row_xml, count=1)
    return re.sub(r'(<c\b[^>]*\br="[A-Z]+)\d+(\")', rf"\g<1>{target_row}\2", row_xml)


def _last_product_sequence(row_xml):
    cell = _find_cell(row_xml, "A") or ""
    value = re.search(r"<v>(.*?)</v>", cell)
    try:
        return int(float(value.group(1))) if value else 0
    except ValueError:
        return 0


def _set_row_cell(row_xml, column, row, value, kind):
    existing = re.search(
        rf'<c\b(?P<attrs>[^>]*\br="{column}{row}"[^>]*)(?:/>|>(?P<body>.*?)</c>)',
        row_xml,
        re.DOTALL,
    )
    style = ""
    if existing:
        style_match = re.search(r'\bs="([^"]+)"', existing.group("attrs") or "")
        if style_match:
            style = f' s="{style_match.group(1)}"'
    elif column == "D":
        template = _find_cell(row_xml, "E") or _find_cell(row_xml, "C") or ""
        style_match = re.search(r'\bs="([^"]+)"', template)
        if style_match:
            style = f' s="{style_match.group(1)}"'

    ref = f"{column}{row}"
    if kind == "blank":
        replacement = f'<c r="{ref}"{style}/>'
    elif kind == "inline":
        replacement = f'<c r="{ref}"{style} t="inlineStr"><is><t xml:space="preserve">{_xml_escape(str(value))}</t></is></c>'
    elif kind == "formula":
        replacement = f'<c r="{ref}"{style}><f>{_xml_escape(str(value))}</f></c>'
    else:
        number = float(value)
        value_text = str(int(number)) if number.is_integer() else str(number)
        replacement = f'<c r="{ref}"{style} t="n"><v>{value_text}</v></c>'

    if existing:
        return row_xml[:existing.start()] + replacement + row_xml[existing.end():]
    close = row_xml.rfind("</row>")
    return row_xml[:close] + replacement + row_xml[close:]


def _xml_escape(value):
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


CELL_REF = re.compile(r"(?P<col>\$?[A-Z]{1,3})(?P<row>\$?\d+)")
CELL_RANGE = re.compile(
    r"(?P<start_col>\$?[A-Z]{1,3})(?P<start_row>\$?\d+)"
    r":(?P<end_col>\$?[A-Z]{1,3})(?P<end_row>\$?\d+)"
)


def _shift_a1_expression(value, insert_row):
    def replace_range(match):
        start_text = match.group("start_row")
        end_text = match.group("end_row")
        start_row = int(start_text.lstrip("$"))
        end_row = int(end_text.lstrip("$"))
        if insert_row <= start_row:
            start_row += 1
            end_row += 1
        elif start_row < insert_row <= end_row + 1:
            end_row += 1
        start_prefix = "$" if start_text.startswith("$") else ""
        end_prefix = "$" if end_text.startswith("$") else ""
        return (
            match.group("start_col") + start_prefix + str(start_row)
            + ":" + match.group("end_col") + end_prefix + str(end_row)
        )

    shifted_ranges = []

    def store_range(match):
        shifted_ranges.append(replace_range(match))
        return f"__VP_RANGE_{len(shifted_ranges) - 1}__"

    value = CELL_RANGE.sub(store_range, value)

    def replace(match):
        row_text = match.group("row")
        absolute = row_text.startswith("$")
        row = int(row_text.lstrip("$"))
        if row >= insert_row:
            row += 1
        return match.group("col") + ("$" if absolute else "") + str(row)
    value = CELL_REF.sub(replace, value)
    for index, shifted in enumerate(shifted_ranges):
        value = value.replace(f"__VP_RANGE_{index}__", shifted)
    return value


def _shift_defined_names_for_sheet(xml_text, sheet_name, insert_row):
    quoted_name = sheet_name.replace("'", "''")
    pattern = re.compile(
        rf"(<definedName\b[^>]*>)(?P<value>[^<]*'{re.escape(quoted_name)}'![^<]*)(</definedName>)"
    )
    return pattern.sub(
        lambda match: match.group(1)
        + _shift_a1_expression(match.group("value"), insert_row)
        + match.group(3),
        xml_text,
    )


def _shift_range_attributes(xml_text, insert_row):
    return re.sub(
        r'\b(ref|sqref|activeCell)="([^"]+)"',
        lambda m: f'{m.group(1)}="{_shift_a1_expression(m.group(2), insert_row)}"',
        xml_text,
    )


def _shift_sqref_text(xml_text, insert_row):
    return re.sub(
        r'(<(?:\w+:)?sqref>)(.*?)(</(?:\w+:)?sqref>)',
        lambda m: m.group(1) + _shift_a1_expression(m.group(2), insert_row) + m.group(3),
        xml_text,
        flags=re.DOTALL,
    )


def _expand_dimension(xml_text, new_row):
    return re.sub(
        r'(<dimension\b[^>]*\bref="[A-Z]+\d+:?[A-Z]*)(\d+)(")',
        lambda m: m.group(1) + str(max(int(m.group(2)), new_row)) + m.group(3),
        xml_text,
        count=1,
    )


def _force_recalculation(xml_text):
    pattern = re.compile(r"<calcPr\b(?P<attrs>[^>]*)\s*/>")
    match = pattern.search(xml_text)
    if match:
        attrs = re.sub(r'\s+(?:calcMode|fullCalcOnLoad|forceFullCalc|calcCompleted)="[^"]*"', "", match.group("attrs").rstrip(" /\t\r\n"))
        replacement = f'<calcPr{attrs} calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1" calcCompleted="0"/>'
        return xml_text[:match.start()] + replacement + xml_text[match.end():]
    return xml_text.replace("</workbook>", '<calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1" calcCompleted="0"/></workbook>', 1)


def _validate_package(path):
    with zipfile.ZipFile(path, "r") as archive:
        broken = archive.testzip()
        if broken:
            raise TemplateUpdateError(f"ไฟล์ Excel เสียหายบริเวณ: {broken}")
        for name in archive.namelist():
            if name.endswith(".xml") or name.endswith(".rels"):
                ElementTree.fromstring(archive.read(name))
