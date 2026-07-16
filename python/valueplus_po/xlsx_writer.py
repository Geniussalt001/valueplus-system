import os
import re
import shutil
import tempfile
import zipfile
from datetime import date
from pathlib import Path
from xml.etree import ElementTree
from xml.sax.saxutils import escape


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"


class XlsxWriteError(ValueError):
    pass


def thai_date_to_excel_serial(value: str) -> int:
    day, month, buddhist_year = [int(part) for part in value.split("/")]
    gregorian_year = buddhist_year - 543
    parsed = date(gregorian_year, month, day)
    return (parsed - date(1899, 12, 30)).days


def write_workbook(
    template_path: str | Path,
    output_path: str | Path,
    sheet_updates: dict[str, dict[str, str | int | float | None]],
) -> None:
    source = Path(template_path)
    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(source, "r") as source_zip:
        sheet_parts = _resolve_sheet_parts(source_zip)

        unknown_sheets = sorted(set(sheet_updates) - set(sheet_parts))
        if unknown_sheets:
            raise XlsxWriteError(
                "ไม่พบชีตใน Template: " + ", ".join(unknown_sheets),
            )

        patches_by_part = {
            sheet_parts[sheet_name]: updates
            for sheet_name, updates in sheet_updates.items()
        }

        file_descriptor, temporary_name = tempfile.mkstemp(
            suffix=".xlsx",
            dir=destination.parent,
        )
        os.close(file_descriptor)

        try:
            with zipfile.ZipFile(temporary_name, "w") as output_zip:
                for zip_info in source_zip.infolist():
                    data = source_zip.read(zip_info.filename)

                    if zip_info.filename in patches_by_part:
                        xml_text = data.decode("utf-8")
                        for cell_ref, value in patches_by_part[zip_info.filename].items():
                            xml_text = _replace_existing_cell(xml_text, cell_ref, value)
                        data = xml_text.encode("utf-8")

                    if zip_info.filename == "xl/workbook.xml":
                        xml_text = data.decode("utf-8")
                        xml_text = _force_recalculation(xml_text)
                        data = xml_text.encode("utf-8")

                    output_zip.writestr(zip_info, data)

            shutil.move(temporary_name, destination)
        except Exception:
            if os.path.exists(temporary_name):
                os.unlink(temporary_name)
            raise


def _resolve_sheet_parts(source_zip: zipfile.ZipFile) -> dict[str, str]:
    workbook_root = ElementTree.fromstring(source_zip.read("xl/workbook.xml"))
    rels_root = ElementTree.fromstring(
        source_zip.read("xl/_rels/workbook.xml.rels"),
    )

    relation_targets = {
        relation.attrib["Id"]: relation.attrib["Target"]
        for relation in rels_root.findall(f"{{{PACKAGE_REL_NS}}}Relationship")
    }

    result = {}
    for sheet in workbook_root.findall(f".//{{{MAIN_NS}}}sheet"):
        relation_id = sheet.attrib[f"{{{REL_NS}}}id"]
        target = relation_targets[relation_id].lstrip("/")
        if not target.startswith("xl/"):
            target = f"xl/{target}"
        result[sheet.attrib["name"]] = target

    return result


def _replace_existing_cell(
    xml_text: str,
    cell_ref: str,
    value: str | int | float | None,
) -> str:
    escaped_ref = re.escape(cell_ref.upper())
    pattern = re.compile(
        rf'<c(?P<attrs>[^>]*\br="{escaped_ref}"[^>]*)>(?P<body>.*?)</c>'
        rf'|<c(?P<selfattrs>[^>]*\br="{escaped_ref}"[^>]*)/>',
        re.DOTALL,
    )
    match = pattern.search(xml_text)
    if not match:
        raise XlsxWriteError(f"ไม่พบเซลล์ {cell_ref} ในโครงสร้าง Template")

    attrs = match.group("attrs") or match.group("selfattrs") or ""
    attrs = re.sub(r'\s+t="[^"]*"', "", attrs)
    attrs = attrs.rstrip(" /")

    if value is None:
        replacement = f"<c{attrs}/>"
    elif isinstance(value, str):
        replacement = (
            f'<c{attrs} t="inlineStr"><is><t xml:space="preserve">'
            f"{escape(value)}</t></is></c>"
        )
    else:
        replacement = f'<c{attrs} t="n"><v>{value}</v></c>'

    return xml_text[: match.start()] + replacement + xml_text[match.end() :]


def _force_recalculation(xml_text: str) -> str:
    calc_pattern = re.compile(r"<calcPr\b([^>]*)/>")
    match = calc_pattern.search(xml_text)
    if not match:
        return xml_text

    attrs = match.group(1)
    attrs = re.sub(r'\s+(?:fullCalcOnLoad|forceFullCalc|calcMode)="[^"]*"', "", attrs)
    replacement = (
        f'<calcPr{attrs} calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>'
    )
    return xml_text[: match.start()] + replacement + xml_text[match.end() :]

