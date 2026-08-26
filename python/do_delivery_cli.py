import argparse
import hashlib
import json
import re
import sys
from collections import defaultdict
from io import BytesIO
from pathlib import Path

import pdfplumber
import xlrd
from fontTools.ttLib import TTFont
from pypdf import PdfReader


DATE_PATTERN = re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b")
PRODUCT_CODE_PATTERN = re.compile(r"\d{7}")
BRANCH_CODE_PATTERN = re.compile(r"\d{5}")
CID_REPLACEMENTS = {
    "(cid:1142)": "็", "(cid:1143)": "่", "(cid:1144)": "้",
    "(cid:1147)": "์", "(cid:1148)": "ำ", "(cid:1173)": "่",
    "(cid:1174)": "้", "(cid:1177)": "์",
}


def load_product_names():
    path = Path(__file__).parent / "valueplus_billing" / "data" / "products.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    return {str(item["cpall_code"]): item.get("pdf_name", "") for item in payload["products"]}


def build_glyph_decoder(path):
    reader = PdfReader(str(path))
    resources = reader.pages[0]["/Resources"]["/Font"]
    font_ref = resources.get("/F3") or next(iter(resources.values()))
    font = font_ref.get_object()
    if font.get("/DescendantFonts"):
        font = font["/DescendantFonts"][0].get_object()
    descriptor = font["/FontDescriptor"].get_object()
    font_bytes = descriptor["/FontFile2"].get_object().get_data()
    tt_font = TTFont(BytesIO(font_bytes))
    glyph_order = tt_font.getGlyphOrder()
    unicode_by_glyph = {}
    for table in tt_font["cmap"].tables:
        for codepoint, glyph_name in table.cmap.items():
            unicode_by_glyph.setdefault(glyph_name, codepoint)

    def decode(value):
        output = []
        for character in str(value or ""):
            glyph_id = ord(character)
            if glyph_id >= 256 and glyph_id < len(glyph_order):
                codepoint = unicode_by_glyph.get(glyph_order[glyph_id])
                output.append(chr(codepoint) if codepoint else character)
            else:
                output.append(character)
        text = "".join(output)
        for source, target in CID_REPLACEMENTS.items():
            text = text.replace(source, target)
        return re.sub(r"\s+", " ", text).strip()

    return decode


def normalize_date(match):
    day, month, buddhist_year = map(int, match.groups())
    year = buddhist_year - 543 if buddhist_year >= 2400 else buddhist_year
    return f"{day:02d}/{month:02d}/{buddhist_year:04d}", year, month


def word_center(word):
    return (float(word["x0"]) + float(word["x1"])) / 2


def parse_page(page, decode, source_file, source_id, page_number, product_names):
    words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
    for word in words:
        word["decoded"] = decode(word["text"])

    header_text = " ".join(word["decoded"] for word in words if float(word["top"]) < 120)
    date_match = DATE_PATTERN.search(header_text)
    if not date_match:
        return [], None
    date_text, year, month = normalize_date(date_match)
    warehouse_match = re.search(r"\b(WB\d{2})\b", header_text, re.IGNORECASE)
    warehouse_code = warehouse_match.group(1).upper() if warehouse_match else ""
    route_candidates = [
        word["decoded"] for word in words
        if float(word["top"]) < 120 and float(word["x0"]) > page.width * 0.45
        and BRANCH_CODE_PATTERN.fullmatch(word["decoded"])
    ]
    route_code = route_candidates[-1] if route_candidates else ""

    product_columns = []
    for word in words:
        text = word["decoded"]
        if word.get("upright") is False and PRODUCT_CODE_PATTERN.fullmatch(text):
            code = text[::-1]
            if code.startswith("600"):
                product_columns.append((word_center(word), code))
    product_columns.sort()
    if not product_columns:
        return [], {"page": page_number, "reason": "ไม่พบคอลัมน์สินค้า"}

    first_product_x = product_columns[0][0]
    sequences = [
        word for word in words
        if word.get("upright") is not False
        and re.fullmatch(r"\d{3}", word["decoded"])
        and float(word["x0"]) < page.width * 0.06
        and float(word["top"]) > 150
    ]
    sequences.sort(key=lambda item: float(item["top"]))
    records = []

    for index, sequence in enumerate(sequences):
        center_y = (float(sequence["top"]) + float(sequence["bottom"])) / 2
        previous_center = None if index == 0 else (
            float(sequences[index - 1]["top"]) + float(sequences[index - 1]["bottom"])
        ) / 2
        next_center = None if index + 1 == len(sequences) else (
            float(sequences[index + 1]["top"]) + float(sequences[index + 1]["bottom"])
        ) / 2
        row_top = 195 if previous_center is None else (previous_center + center_y) / 2
        row_bottom = page.height - 20 if next_center is None else (center_y + next_center) / 2

        row_words = [
            word for word in words
            if row_top <= (float(word["top"]) + float(word["bottom"])) / 2 < row_bottom
            and word.get("upright") is not False
        ]
        branch_codes = [
            word for word in row_words
            if page.width * 0.04 < float(word["x0"]) < page.width * 0.11
            and BRANCH_CODE_PATTERN.fullmatch(word["decoded"])
        ]
        if not branch_codes:
            continue
        branch_code = branch_codes[0]["decoded"]
        name_parts = [
            word["decoded"] for word in sorted(row_words, key=lambda item: (float(item["top"]), float(item["x0"])))
            if float(word["x0"]) > page.width * 0.08
            and float(word["x1"]) < first_product_x - 3
            and not BRANCH_CODE_PATTERN.fullmatch(word["decoded"])
        ]
        branch_name = re.sub(r"^สาขา\s*", "", " ".join(name_parts)).strip()
        branch_name = branch_name.replace("จำนวนรวม", "").replace("จำานวนรวม", "").strip()

        for quantity_word in row_words:
            quantity_y = (float(quantity_word["top"]) + float(quantity_word["bottom"])) / 2
            if abs(quantity_y - center_y) > 8:
                continue
            quantity_text = quantity_word["decoded"].replace(",", "")
            if not re.fullmatch(r"\d+(?:\.\d+)?", quantity_text):
                continue
            quantity_x = word_center(quantity_word)
            nearest_x, product_code = min(product_columns, key=lambda item: abs(item[0] - quantity_x))
            if abs(nearest_x - quantity_x) > 12:
                continue
            quantity = float(quantity_text)
            if quantity <= 0:
                continue
            record_key = "|".join([
                source_id, str(page_number), branch_code, product_code,
            ])
            records.append({
                "record_key": record_key,
                "source_id": source_id,
                "source_file": source_file,
                "page": page_number,
                "date": date_text,
                "year": year,
                "buddhist_year": year + 543,
                "month": month,
                "warehouse_code": warehouse_code,
                "route_code": route_code,
                "branch_code": branch_code,
                "branch_name": branch_name,
                "product_code": product_code,
                "product_name": product_names.get(product_code, ""),
                "quantity": quantity,
            })
    return records, None


def parse_pdf_file(path, product_names):
    path = Path(path)
    source_id = hashlib.sha256(path.read_bytes()).hexdigest()
    decode = build_glyph_decoder(path)
    records = []
    warnings = []
    with pdfplumber.open(path) as pdf:
        for page_number, page in enumerate(pdf.pages, 1):
            page_records, warning = parse_page(
                page, decode, path.name, source_id, page_number, product_names,
            )
            records.extend(page_records)
            if warning:
                warnings.append(warning)
    return records, warnings, source_id


def clean_excel_product_name(value):
    lines = [part.strip() for part in str(value or "").splitlines() if part.strip()]
    name = " ".join(lines[1:]) if len(lines) > 1 else ""
    return re.sub(r"^H|UM$", "", name).strip()


def parse_excel_file(path, product_names):
    path = Path(path)
    source_id = hashlib.sha256(path.read_bytes()).hexdigest()
    workbook = xlrd.open_workbook(str(path), formatting_info=False)
    date_match = None
    for sheet in workbook.sheets():
        for row_index in range(min(sheet.nrows, 8)):
            date_match = DATE_PATTERN.search(" ".join(str(sheet.cell_value(row_index, column)) for column in range(sheet.ncols)))
            if date_match:
                break
        if date_match:
            break
    if not date_match:
        raise ValueError("ไม่พบวันที่สั่งในไฟล์ Excel DO")
    date_text, year, month = normalize_date(date_match)
    records, warnings = [], []
    for page_number, sheet in enumerate(workbook.sheets(), 1):
        if sheet.nrows < 9:
            warnings.append({"page": page_number, "reason": "ชีตไม่มีตารางจัดส่ง"})
            continue
        warehouse_text = " ".join(str(sheet.cell_value(4, column)) for column in range(sheet.ncols))
        warehouse_match = re.search(r"\b(WB\d{2})\b", warehouse_text, re.IGNORECASE)
        warehouse_code = warehouse_match.group(1).upper() if warehouse_match else ""
        route_text = " ".join(str(sheet.cell_value(5, column)) for column in range(sheet.ncols))
        route_matches = re.findall(r"\b\d{5}\b", route_text)
        route_code = route_matches[-1] if route_matches else ""
        product_columns = []
        for column in range(sheet.ncols):
            header = str(sheet.cell_value(7, column) or "").strip()
            match = PRODUCT_CODE_PATTERN.search(header)
            if match and match.group(0).startswith("600"):
                code = match.group(0)
                product_columns.append((column, code, product_names.get(code) or clean_excel_product_name(header)))
        if not product_columns:
            warnings.append({"page": page_number, "reason": "ไม่พบคอลัมน์สินค้า"})
            continue
        for row_index in range(8, sheet.nrows):
            branch_text = str(sheet.cell_value(row_index, 1) or "").strip()
            branch_match = re.match(r"\s*(\d{5})\s+(.+)", branch_text, re.DOTALL)
            if not branch_match:
                continue
            branch_code = branch_match.group(1)
            branch_name = re.sub(r"^สาขา\s*", "", re.sub(r"\s+", " ", branch_match.group(2))).strip()
            for column, product_code, product_name in product_columns:
                value = sheet.cell_value(row_index, column)
                try:
                    quantity = float(value)
                except (TypeError, ValueError):
                    continue
                if quantity <= 0:
                    continue
                records.append({
                    "record_key": "|".join([source_id, str(page_number), branch_code, product_code]),
                    "source_id": source_id, "source_file": path.name, "page": page_number,
                    "date": date_text, "year": year, "buddhist_year": year + 543, "month": month,
                    "warehouse_code": warehouse_code, "route_code": route_code,
                    "branch_code": branch_code, "branch_name": branch_name,
                    "product_code": product_code, "product_name": product_name, "quantity": quantity,
                })
    return records, warnings, source_id


def parse_file(path, product_names):
    suffix = Path(path).suffix.lower()
    if suffix == ".pdf":
        return parse_pdf_file(path, product_names)
    if suffix == ".xls":
        return parse_excel_file(path, product_names)
    raise ValueError(f"ชนิดไฟล์ DO ยังไม่รองรับ: {suffix}")


def build_result(file_paths):
    product_names = load_product_names()
    all_records = []
    files = []
    seen_sources = set()
    for file_path in file_paths:
        records, warnings, source_id = parse_file(file_path, product_names)
        duplicate = source_id in seen_sources
        if not duplicate:
            all_records.extend(records)
            seen_sources.add(source_id)
        files.append({
            "name": Path(file_path).name,
            "source_id": source_id,
            "record_count": len(records),
            "warning_count": len(warnings),
            "duplicate_in_selection": duplicate,
        })
    if not all_records:
        raise ValueError("ไม่พบข้อมูลจัดส่งในไฟล์ DO")

    branch_totals = defaultdict(lambda: {"name": "", "quantity": 0.0})
    product_totals = defaultdict(lambda: {"name": "", "quantity": 0.0})
    warehouse_totals = defaultdict(float)
    for record in all_records:
        branch = branch_totals[record["branch_code"]]
        branch["name"] = record["branch_name"]
        branch["quantity"] += record["quantity"]
        product = product_totals[record["product_code"]]
        product["name"] = record["product_name"]
        product["quantity"] += record["quantity"]
        warehouse_totals[record["warehouse_code"]] += record["quantity"]

    top_branches = sorted(
        ({"branch_code": code, "branch_name": item["name"], "quantity": item["quantity"]} for code, item in branch_totals.items()),
        key=lambda item: (-item["quantity"], item["branch_code"]),
    )[:20]
    top_products = sorted(
        ({"product_code": code, "product_name": item["name"], "quantity": item["quantity"]} for code, item in product_totals.items()),
        key=lambda item: (-item["quantity"], item["product_code"]),
    )[:20]
    warehouses = sorted(
        ({"warehouse_code": code, "quantity": quantity} for code, quantity in warehouse_totals.items()),
        key=lambda item: (-item["quantity"], item["warehouse_code"]),
    )
    return {
        "file_count": len(files),
        "record_count": len(all_records),
        "branch_count": len(branch_totals),
        "product_count": len(product_totals),
        "total_quantity": sum(record["quantity"] for record in all_records),
        "files": files,
        "records": all_records,
        "top_branches": top_branches,
        "top_products": top_products,
        "warehouses": warehouses,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", action="append", required=True)
    args = parser.parse_args()
    try:
        print(json.dumps({"success": True, "data": build_result(args.file)}, ensure_ascii=False))
    except Exception as error:
        print(json.dumps({"success": False, "message": str(error)}, ensure_ascii=False))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
