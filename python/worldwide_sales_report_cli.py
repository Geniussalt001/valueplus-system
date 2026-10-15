import argparse
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side


DATA_SHEET = "ข้อมูลรวม"
SUMMARY_SHEET = "สรุป"
DATA_HEADERS = [
    "วันที่", "บริษัท", "ร้านค้า", "จังหวัด", "สินค้า",
    "น้ำหนัก (กรัม)", "จำนวน (ลัง)", "_SALE_ID",
]
VISIBLE_DATA_COLUMNS = 7
THAI_MONTHS = [
    "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม",
    "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม",
    "พฤศจิกายน", "ธันวาคม",
]
HEADER_FILL = PatternFill("solid", fgColor="6D28D9")
HEADER_FONT = Font(color="FFFFFF", bold=True)
THIN_BORDER = Border(bottom=Side(style="thin", color="E2E8F0"))
LIGHT_FILL = PatternFill("solid", fgColor="F8FAFC")


def company_label(part):
    return "Valueplus Retail" if str(part).lower() == "retail" else "Valueplus Worldwide"


def normalize_existing_date(value):
    if isinstance(value, datetime):
        return value
    text = str(value or "").strip()
    for date_format in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, date_format)
        except ValueError:
            continue
    return value


def normalize_payload(payload):
    sale_id = str(payload.get("saleId") or "").strip()
    sale_date = datetime.strptime(str(payload.get("date") or ""), "%Y-%m-%d")
    store = payload.get("store") or {}
    items = payload.get("items") or []
    if not sale_id or not str(store.get("name") or "").strip() or not items:
        raise ValueError("ข้อมูลรายการขายสำหรับสร้าง Excel ไม่ครบถ้วน")

    normalized_items = []
    for item in items:
        cartons = int(item.get("cartons") or 0)
        if cartons <= 0:
            raise ValueError("จำนวนลังต้องมากกว่า 0")
        normalized_items.append({
            "name": str(item.get("name") or "").strip(),
            "weightGrams": float(item.get("weightGrams") or 0),
            "cartons": cartons,
        })
    return {
        "saleId": sale_id,
        "date": sale_date,
        "company": company_label(payload.get("part")),
        "store": str(store.get("name") or "").strip(),
        "province": str(store.get("province") or "").strip(),
        "items": normalized_items,
        "createdAt": str(payload.get("createdAt") or "").strip(),
    }


def ensure_data_sheet(workbook):
    sheet = workbook[DATA_SHEET] if DATA_SHEET in workbook.sheetnames else workbook.create_sheet(DATA_SHEET, 0)
    if sheet.cell(1, 1).value == "รหัสรายการ":
        migrated_rows = []
        for row in sheet.iter_rows(min_row=2, max_col=9, values_only=True):
            if not row[0]:
                continue
            migrated_rows.append([
                normalize_existing_date(row[1]), row[2], row[3], row[4], row[5],
                row[6], row[7], row[0],
            ])
        sheet.delete_rows(1, sheet.max_row)
        sheet.append(DATA_HEADERS)
        for row in migrated_rows:
            sheet.append(row)
    elif sheet.max_row == 1 and not sheet.cell(1, 1).value:
        for column, value in enumerate(DATA_HEADERS, 1):
            sheet.cell(1, column, value)
    else:
        for column, value in enumerate(DATA_HEADERS, 1):
            sheet.cell(1, column, value)

    for cell in sheet[1][:VISIBLE_DATA_COLUMNS]:
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center")
    sheet.row_dimensions[1].height = 25
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = f"A1:G{max(sheet.max_row, 2)}"
    sheet.sheet_view.showGridLines = False
    sheet.sheet_view.zoomScale = 90
    sheet.sheet_properties.pageSetUpPr.fitToPage = True
    sheet.page_setup.orientation = "landscape"
    sheet.page_setup.fitToWidth = 1
    sheet.page_setup.fitToHeight = 0
    sheet.print_title_rows = "1:1"
    sheet.print_area = f"A1:G{max(sheet.max_row, 2)}"
    sheet.column_dimensions["H"].hidden = True
    widths = [14, 24, 32, 20, 38, 18, 16]
    for index, width in enumerate(widths, 1):
        sheet.column_dimensions[chr(64 + index)].width = width
    for row in range(2, sheet.max_row + 1):
        sheet.cell(row, 1).number_format = "dd/mm/yyyy"
        sheet.cell(row, 6).number_format = "#,##0.##"
        sheet.cell(row, 7).number_format = "#,##0"
    return sheet


def replace_sale_rows(sheet, record):
    for row in range(sheet.max_row, 1, -1):
        if str(sheet.cell(row, 8).value or "") == record["saleId"]:
            sheet.delete_rows(row)

    for item in record["items"]:
        sheet.append([
            record["date"], record["company"], record["store"],
            record["province"], item["name"], item["weightGrams"],
            item["cartons"], record["saleId"],
        ])
        row = sheet.max_row
        sheet.cell(row, 1).number_format = "dd/mm/yyyy"
        sheet.cell(row, 6).number_format = "#,##0.##"
        sheet.cell(row, 7).number_format = "#,##0"
        if row % 2 == 1:
            for cell in sheet[row][:VISIBLE_DATA_COLUMNS]:
                cell.fill = LIGHT_FILL
        for cell in sheet[row][:VISIBLE_DATA_COLUMNS]:
            cell.border = THIN_BORDER
            cell.alignment = Alignment(vertical="center")
    sheet.auto_filter.ref = f"A1:G{max(sheet.max_row, 2)}"


def read_report_rows(data_sheet):
    rows = []
    for row in data_sheet.iter_rows(min_row=2, max_col=8, values_only=True):
        if not row[0] or not row[4]:
            continue
        rows.append({
            "date": row[0], "company": str(row[1] or ""),
            "store": str(row[2] or ""), "province": str(row[3] or ""),
            "product": str(row[4] or ""), "weight": float(row[5] or 0),
            "cartons": int(row[6] or 0), "saleId": str(row[7] or ""),
        })
    return rows


def style_table_header(sheet, row, start_column, headers):
    for offset, value in enumerate(headers):
        cell = sheet.cell(row, start_column + offset, value)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center")
    sheet.row_dimensions[row].height = 23


def style_kpi(sheet, start_column, label, value, fill_color, font_color):
    end_column = start_column + 2
    sheet.merge_cells(start_row=3, start_column=start_column, end_row=3, end_column=end_column)
    sheet.merge_cells(start_row=4, start_column=start_column, end_row=5, end_column=end_column)
    label_cell = sheet.cell(3, start_column, label)
    value_cell = sheet.cell(4, start_column, value)
    for row in range(3, 6):
        for column in range(start_column, end_column + 1):
            sheet.cell(row, column).fill = PatternFill("solid", fgColor=fill_color)
    label_cell.font = Font(name="Tahoma", bold=True, color=font_color, size=10)
    value_cell.font = Font(name="Tahoma", bold=True, color=font_color, size=18)
    label_cell.alignment = Alignment(horizontal="center", vertical="center")
    value_cell.alignment = Alignment(horizontal="center", vertical="center")
    value_cell.number_format = "#,##0"


def rebuild_summary(workbook, data_sheet, month, buddhist_year):
    if SUMMARY_SHEET in workbook.sheetnames:
        del workbook[SUMMARY_SHEET]
    sheet = workbook.create_sheet(SUMMARY_SHEET, 1)
    sheet.sheet_view.showGridLines = False
    rows = read_report_rows(data_sheet)
    total_cartons = sum(row["cartons"] for row in rows)
    sale_ids = {row["saleId"] for row in rows if row["saleId"]}
    stores = {row["store"] for row in rows}
    products = {row["product"] for row in rows}

    sheet.merge_cells("A1:L1")
    sheet["A1"] = f"สรุปรายงานยอดขาย ประจำเดือน{THAI_MONTHS[month]} {buddhist_year}"
    sheet["A1"].fill = PatternFill("solid", fgColor="312E81")
    sheet["A1"].font = Font(name="Tahoma", color="FFFFFF", bold=True, size=16)
    sheet["A1"].alignment = Alignment(horizontal="left", vertical="center")
    sheet.row_dimensions[1].height = 34

    style_kpi(sheet, 1, "ยอดรวม (ลัง)", total_cartons, "EDE9FE", "5B21B6")
    style_kpi(sheet, 4, "จำนวนบิล", len(sale_ids), "E0F2FE", "0369A1")
    style_kpi(sheet, 7, "จำนวนร้านค้า", len(stores), "DCFCE7", "15803D")
    style_kpi(sheet, 10, "จำนวนสินค้า", len(products), "FEF3C7", "B45309")

    company_totals = defaultdict(int)
    product_totals = defaultdict(int)
    product_weights = {}
    daily_totals = defaultdict(int)
    for item in rows:
        company_totals[item["company"]] += item["cartons"]
        product_totals[item["product"]] += item["cartons"]
        product_weights[item["product"]] = item["weight"]
        daily_totals[item["date"]] += item["cartons"]

    sheet["A8"] = "สรุปยอดตามสินค้า"
    sheet["A8"].font = Font(name="Tahoma", bold=True, size=12, color="312E81")
    style_table_header(sheet, 9, 1, ["สินค้า", "น้ำหนัก (กรัม)", "จำนวน (ลัง)"])
    product_rows = sorted(product_totals.items(), key=lambda item: (-item[1], item[0]))
    for index, (product, cartons) in enumerate(product_rows, 10):
        sheet.cell(index, 1, product)
        sheet.cell(index, 2, product_weights[product]).number_format = "#,##0.##"
        sheet.cell(index, 3, cartons).number_format = "#,##0"
        if index % 2 == 0:
            for column in range(1, 4):
                sheet.cell(index, column).fill = LIGHT_FILL

    sheet["E8"] = "สรุปยอดตามบริษัท"
    sheet["E8"].font = Font(name="Tahoma", bold=True, size=12, color="312E81")
    style_table_header(sheet, 9, 5, ["บริษัท", "จำนวน (ลัง)"])
    for index, company in enumerate(("Valueplus Retail", "Valueplus Worldwide"), 10):
        sheet.cell(index, 5, company)
        sheet.cell(index, 6, company_totals[company]).number_format = "#,##0"

    sheet["E14"] = "ยอดขายรายวัน"
    sheet["E14"].font = Font(name="Tahoma", bold=True, size=12, color="312E81")
    style_table_header(sheet, 15, 5, ["วันที่", "จำนวน (ลัง)"])
    daily_rows = sorted(daily_totals.items(), key=lambda item: item[0])
    for index, (date_value, cartons) in enumerate(daily_rows, 16):
        sheet.cell(index, 5, date_value).number_format = "dd/mm/yyyy"
        sheet.cell(index, 6, cartons).number_format = "#,##0"

    chart = BarChart()
    chart.type = "col"
    chart.style = 10
    chart.title = "ยอดขายรายวัน (ลัง)"
    chart.y_axis.title = "จำนวนลัง"
    chart.x_axis.title = "วันที่"
    if daily_rows:
        chart.add_data(Reference(sheet, min_col=6, min_row=15, max_row=15 + len(daily_rows)), titles_from_data=True)
        chart.set_categories(Reference(sheet, min_col=5, min_row=16, max_row=15 + len(daily_rows)))
    chart.height = 7
    chart.width = 12
    chart.legend = None
    sheet.add_chart(chart, "G8")

    top_product_count = min(len(product_rows), 10)
    product_chart = BarChart()
    product_chart.type = "bar"
    product_chart.style = 10
    product_chart.title = "10 อันดับสินค้าสูงสุด (ลัง)"
    product_chart.x_axis.title = "จำนวนลัง"
    if top_product_count:
        product_chart.add_data(Reference(sheet, min_col=3, min_row=9, max_row=9 + top_product_count), titles_from_data=True)
        product_chart.set_categories(Reference(sheet, min_col=1, min_row=10, max_row=9 + top_product_count))
    product_chart.height = 7.5
    product_chart.width = 12
    product_chart.legend = None
    sheet.add_chart(product_chart, "G24")

    detail_start = max(43, 11 + len(product_rows), 17 + len(daily_rows))
    sheet.cell(detail_start, 1, "รายละเอียดการขาย (ใช้ตัวกรองที่หัวตารางเพื่อเลือกบริษัท ร้านค้า หรือสินค้า)")
    sheet.cell(detail_start, 1).font = Font(name="Tahoma", bold=True, size=12, color="312E81")
    detail_header = detail_start + 1
    detail_headers = ["วันที่", "บริษัท", "ร้านค้า", "จังหวัด", "สินค้า", "น้ำหนัก (กรัม)", "จำนวน (ลัง)"]
    style_table_header(sheet, detail_header, 1, detail_headers)
    for index, item in enumerate(sorted(rows, key=lambda entry: (entry["date"], entry["store"], entry["product"])), detail_header + 1):
        values = [item["date"], item["company"], item["store"], item["province"], item["product"], item["weight"], item["cartons"]]
        for column, value in enumerate(values, 1):
            sheet.cell(index, column, value)
        sheet.cell(index, 1).number_format = "dd/mm/yyyy"
        sheet.cell(index, 6).number_format = "#,##0.##"
        sheet.cell(index, 7).number_format = "#,##0"
        if index % 2 == 0:
            for column in range(1, 8):
                sheet.cell(index, column).fill = LIGHT_FILL
    sheet.auto_filter.ref = f"A{detail_header}:G{max(detail_header + len(rows), detail_header + 1)}"
    sheet.freeze_panes = None

    for column, width in {"A": 34, "B": 18, "C": 16, "D": 24, "E": 24, "F": 16, "G": 3, "H": 15, "I": 16, "J": 14, "K": 14, "L": 14}.items():
        sheet.column_dimensions[column].width = width
    for row in sheet.iter_rows(min_row=1, max_row=sheet.max_row, min_col=1, max_col=12):
        for cell in row:
            if cell.value is not None and cell.font.name != "Tahoma":
                cell.font = Font(name="Tahoma", size=10, bold=cell.font.bold, color=cell.font.color)
            if cell.value is not None:
                cell.alignment = Alignment(vertical="center", horizontal=cell.alignment.horizontal)
    sheet.sheet_properties.pageSetUpPr.fitToPage = True
    sheet.page_setup.orientation = "landscape"
    sheet.page_setup.fitToWidth = 1
    sheet.page_setup.fitToHeight = 0
    sheet.sheet_view.zoomScale = 85
    sheet.print_area = f"A1:R{max(detail_header + len(rows), detail_header + 1)}"
    return sheet


def update_workbook(payload, output_path):
    record = normalize_payload(payload)
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    workbook = load_workbook(path) if path.exists() else Workbook()
    if workbook.sheetnames == ["Sheet"] and not workbook["Sheet"].cell(1, 1).value:
        del workbook["Sheet"]
    data_sheet = ensure_data_sheet(workbook)
    replace_sale_rows(data_sheet, record)
    rebuild_summary(workbook, data_sheet, record["date"].month, record["date"].year + 543)
    workbook.calculation.fullCalcOnLoad = True
    workbook.calculation.forceFullCalc = True
    workbook.calculation.calcMode = "auto"
    try:
        workbook.save(path)
    except PermissionError as error:
        raise ValueError("กรุณาปิดไฟล์ Excel รายงานยอดขายก่อนบันทึกข้อมูล") from error
    return {
        "outputPath": str(path),
        "saleId": record["saleId"],
        "rowCount": len(record["items"]),
        "totalCartons": sum(item["cartons"] for item in record["items"]),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--payload", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    try:
        payload = json.loads(args.payload)
        result = update_workbook(payload, args.output)
        print(json.dumps({"success": True, "data": result}, ensure_ascii=False))
        return 0
    except Exception as error:
        print(json.dumps({"success": False, "message": str(error)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
