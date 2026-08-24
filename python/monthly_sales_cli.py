import argparse
import csv
import hashlib
import json
import os
import re
import shutil
import tempfile
from copy import deepcopy
from datetime import datetime
from pathlib import Path


MONTH_NAMES = {
    1: "มกราคม", 2: "กุมภาพันธ์", 3: "มีนาคม", 4: "เมษายน",
    5: "พฤษภาคม", 6: "มิถุนายน", 7: "กรกฎาคม", 8: "สิงหาคม",
    9: "กันยายน", 10: "ตุลาคม", 11: "พฤศจิกายน", 12: "ธันวาคม",
}

PRODUCTS = {
    "01-0000-10": ("6002487", "ยูมิยูมิ เค้กไข่ชีส 78 กรัม"),
    "01-0000-14": ("6002510", "ยูมิยูมิ อัลมอนด์เค้ก 75 กรัม"),
    "01-0000-16": ("6002567", "ยูมิยูมิ โรลช็อกโกแลตเค้ก 55 กรัม"),
    "01-0000-18": ("6002580", "ยูมิยูมิ มินิครีมเค้ก 40 กรัม"),
    "01-0000-22": ("6002601", "ยูมิยูมิ เค้กครีมไก่หยองน้ำสลัด 75กรัม"),
    "01-0000-23": ("6002613", "ยูมิยูมิ ชิสึเค้ก 70 กรัม"),
    "01-0000-24": ("6002634", "ยูมิยูมิ มิลค์เค้ก 60 กรัม"),
    "01-0000-26": ("6002691", "ยูมิยูมิ บลูเบอร์รี่มอนสเตอร์เบรด 55 กรัม"),
    "01-0000-27": ("6002690", "ยูมิยูมิ สตรอเบอร์รี่มอนสเตอร์เบรด 55 กรัม"),
    "01-0000-29": ("6002424", "ยูมิยูมิ วาฟเฟิลครีมราสเบอร์รี่ 75 กรัม"),
    "01-0000-30": ("6002742", "ยูมิยูมิ วาฟเฟิลครีมโคโคนัทมิลค์ 75 กรัม"),
    "01-0000-31": ("6002769", "ยูมิยูมิ เค้กแอนด์ครีมบลูเบอร์รี่ 75 กรัม"),
    "01-0000-32": ("6002777", "ยูมิยูมิ เค้กแอนด์ครีมสตรอเบอร์รี่ 75 กรัม"),
    "01-0000-33": ("6002781", "ยูมิยูมิ เค้กแอนด์ครีมช็อกโกแลต 75 กรัม"),
    "01-0000-34": ("6002798", "ยูมิยูมิ เยลโล่พีชมอนสเตอร์เบรด 55 กรัม"),
    "01-0000-35": ("6002797", "ยูมิยูมิ เค้กแอนด์ครีมส้ม 75 กรัม"),
    "01-0000-36": ("6002829", "ยูมิยูมิ เค้กแอนด์ครีมเลมอน 75 กรัม"),
    "01-0000-37": ("6002799", "ยูมิยูมิ เค้กแอนด์ครีมเมลอน 75 กรัม"),
    "01-0000-38": ("6002425", "ยูมิยูมิ วาฟเฟิลครีมช็อกโกแลต 75 กรัม"),
}


def respond(data=None, message=None, success=True):
    print(json.dumps({"success": success, "data": data, "message": message}, ensure_ascii=True))


def number(value):
    text = str(value or "").strip().replace(",", "")
    if not text:
        return 0.0
    try:
        return float(text)
    except ValueError:
        return 0.0


def gregorian_date(value):
    match = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", str(value or "").strip())
    if not match:
        return None
    day, month, year = map(int, match.groups())
    if year >= 2400:
        year -= 543
    return datetime(year, month, day)


def decode_csv(path):
    raw = Path(path).read_bytes()
    for encoding in ("utf-8-sig", "cp874", "tis-620"):
        try:
            return raw.decode(encoding), raw
        except UnicodeDecodeError:
            continue
    raise ValueError("ไม่สามารถอ่านรหัสภาษาไทยของไฟล์ CSV ได้")


def parse_snapshot(csv_path):
    text, raw = decode_csv(csv_path)
    rows = list(csv.reader(text.splitlines()))
    current_source = ""
    current_name = ""
    dates = []
    details = []
    ignored_products = set()

    for line_number, row in enumerate(rows, 1):
        row += [""] * (18 - len(row))
        product_name = row[3].strip()
        product_code = row[4].strip()
        date = gregorian_date(row[5])
        document = row[6].strip().upper()

        if product_code in PRODUCTS and product_name:
            current_source = product_code
            current_name = product_name
            continue
        if product_code and re.fullmatch(r"\d{2}-\d{4}-\d{2}", product_code) and product_name:
            current_source = product_code
            current_name = product_name
            ignored_products.add(f"{product_code} {product_name}")
            continue
        if not date or not document or not current_source:
            continue
        if not (document.startswith("IV") or document.startswith("SR")):
            continue
        if current_source not in PRODUCTS:
            continue

        quantity = abs(number(row[7]))
        amount = abs(number(row[15]))
        is_cn = document.startswith("SR") or row[9].strip().upper() == "N"
        target_code, canonical_name = PRODUCTS[current_source]
        details.append({
            "line": line_number,
            "date": date.strftime("%Y-%m-%d"),
            "document": document,
            "sourceCode": current_source,
            "productCode": target_code,
            "name": canonical_name or current_name,
            "type": "CN" if is_cn else "ขาย",
            "quantity": quantity,
            "amount": amount,
        })
        dates.append(date)

    if not details:
        raise ValueError("ไม่พบรายการขายในไฟล์ CSV กรุณาเลือกไฟล์รายงานประวัติการขาย แยกตามลูกค้า")
    month_keys = {date.strftime("%Y-%m") for date in dates}
    if len(month_keys) != 1:
        raise ValueError("ไฟล์ CSV ต้องมีข้อมูลเพียงเดือนเดียว")

    month_key = next(iter(month_keys))
    year, month = map(int, month_key.split("-"))
    product_map = {
        source: {
            "productCode": target,
            "sourceCode": source,
            "name": name,
            "sales": 0,
            "cn": 0,
            "salesAmount": 0.0,
            "cnAmount": 0.0,
        }
        for source, (target, name) in PRODUCTS.items()
    }
    for item in details:
        product = product_map[item["sourceCode"]]
        if item["type"] == "ขาย":
            product["sales"] += item["quantity"]
            product["salesAmount"] += item["amount"]
        else:
            product["cn"] += item["quantity"]
            product["cnAmount"] += item["amount"]

    products = []
    for source in PRODUCTS:
        product = product_map[source]
        product["sales"] = round(product["sales"])
        product["cn"] = round(product["cn"])
        product["salesAmount"] = round(product["salesAmount"], 2)
        product["cnAmount"] = round(product["cnAmount"], 2)
        products.append(product)

    sales = sum(item["sales"] for item in products)
    cn = sum(item["cn"] for item in products)
    return {
        "year": year,
        "month": month,
        "monthKey": month_key,
        "monthName": MONTH_NAMES[month],
        "periodStart": min(dates).strftime("%Y-%m-%d"),
        "periodEnd": max(dates).strftime("%Y-%m-%d"),
        "sourceFile": Path(csv_path).name,
        "sourceHash": hashlib.sha256(raw).hexdigest(),
        "transactionCount": len(details),
        "salesRowCount": sum(item["type"] == "ขาย" for item in details),
        "cnRowCount": sum(item["type"] == "CN" for item in details),
        "sales": sales,
        "cn": cn,
        "net": sales - cn,
        "salesAmount": round(sum(item["salesAmount"] for item in products), 2),
        "cnAmount": round(sum(item["cnAmount"] for item in products), 2),
        "products": products,
        "ignoredProducts": sorted(ignored_products),
    }


def empty_state():
    return {"schemaVersion": 1, "months": {}, "importHistory": []}


def load_state(data_dir, seed_path):
    data_dir = Path(data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)
    state_path = data_dir / "monthly_sales.json"
    seed = empty_state()
    if seed_path and Path(seed_path).is_file():
        seed = json.loads(Path(seed_path).read_text(encoding="utf-8"))
    if state_path.is_file():
        state = json.loads(state_path.read_text(encoding="utf-8"))
        for key, month in seed.get("months", {}).items():
            state.setdefault("months", {}).setdefault(key, month)
        return state, state_path
    return seed, state_path


def save_json_atomic(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(path.suffix + ".tmp")
    temp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temp_path, path)


def month_totals(month):
    products = month.get("products", [])
    sales = sum(float(item.get("sales", 0)) for item in products)
    cn = sum(float(item.get("cn", 0)) for item in products)
    return int(round(sales)), int(round(cn)), int(round(sales - cn))


def enrich_product(item, month_sales, previous=None):
    sales = int(round(float(item.get("sales", 0))))
    cn = int(round(float(item.get("cn", 0))))
    net = sales - cn
    previous_net = 0 if not previous else int(round(float(previous.get("sales", 0)) - float(previous.get("cn", 0))))
    return {
        **item,
        "sales": sales,
        "cn": cn,
        "net": net,
        "cnRate": (cn / sales) if sales else 0,
        "salesShare": (sales / month_sales) if month_sales else 0,
        "previousNet": previous_net,
        "change": net - previous_net,
        "changeRate": ((net - previous_net) / previous_net) if previous_net else None,
    }


def build_summary(state, selected_month=None, workbook_path=""):
    workbook_path = (
        workbook_path
        if workbook_path and Path(workbook_path).is_file()
        else ""
    )
    month_keys = sorted(state.get("months", {}))
    if not month_keys:
        return {"months": [], "selectedMonth": None, "totals": {"sales": 0, "cn": 0, "net": 0}, "products": [], "history": [], "workbookPath": workbook_path}
    selected = selected_month if selected_month in state["months"] else month_keys[-1]
    trend = []
    grand_sales = grand_cn = 0
    for key in month_keys:
        month = state["months"][key]
        sales, cn, net = month_totals(month)
        grand_sales += sales
        grand_cn += cn
        trend.append({
            "key": key, "year": month["year"], "month": month["month"],
            "monthName": month.get("monthName") or MONTH_NAMES[month["month"]],
            "periodEnd": month.get("periodEnd"), "sourceFile": month.get("sourceFile"),
            "importedAt": month.get("importedAt"), "sales": sales, "cn": cn, "net": net,
        })
    current = state["months"][selected]
    current_sales, current_cn, current_net = month_totals(current)
    current_index = month_keys.index(selected)
    previous = state["months"].get(month_keys[current_index - 1]) if current_index > 0 else None
    previous_products = {item["productCode"]: item for item in previous.get("products", [])} if previous else {}
    products = [enrich_product(item, current_sales, previous_products.get(item["productCode"])) for item in current.get("products", [])]
    products.sort(key=lambda item: item["net"], reverse=True)
    return {
        "months": trend,
        "selectedMonth": selected,
        "selected": {
            "key": selected, "year": current["year"], "month": current["month"],
            "monthName": current.get("monthName") or MONTH_NAMES[current["month"]],
            "periodStart": current.get("periodStart"), "periodEnd": current.get("periodEnd"),
            "sourceFile": current.get("sourceFile"), "importedAt": current.get("importedAt"),
            "transactionCount": current.get("transactionCount"),
            "sales": current_sales, "cn": current_cn, "net": current_net,
            "cnRate": (current_cn / current_sales) if current_sales else 0,
        },
        "totals": {"sales": grand_sales, "cn": grand_cn, "net": grand_sales - grand_cn},
        "products": products,
        "history": list(reversed(state.get("importHistory", [])[-20:])),
        "workbookPath": workbook_path,
    }


def preview(csv_path, state):
    parsed = parse_snapshot(csv_path)
    current = state.get("months", {}).get(parsed["monthKey"])
    duplicate = any(entry.get("sourceHash") == parsed["sourceHash"] for entry in state.get("importHistory", []))
    older = bool(current and current.get("periodEnd") and parsed["periodEnd"] < current["periodEnd"])
    parsed["duplicate"] = duplicate
    parsed["olderThanStored"] = older
    parsed["replacesExistingMonth"] = current is not None
    if current:
        old_sales, old_cn, old_net = month_totals(current)
        parsed["previous"] = {"sales": old_sales, "cn": old_cn, "net": old_net, "periodEnd": current.get("periodEnd")}
        parsed["difference"] = {"sales": parsed["sales"] - old_sales, "cn": parsed["cn"] - old_cn, "net": parsed["net"] - old_net}
    else:
        parsed["previous"] = None
        parsed["difference"] = {"sales": parsed["sales"], "cn": parsed["cn"], "net": parsed["net"]}
    return parsed


def import_snapshot(csv_path, state):
    parsed = preview(csv_path, state)
    if parsed["duplicate"]:
        raise ValueError("ไฟล์นี้ถูกนำเข้าแล้ว ข้อมูลในระบบเป็นฉบับล่าสุดอยู่แล้ว")
    if parsed["olderThanStored"]:
        raise ValueError("ไฟล์นี้เก่ากว่าข้อมูลที่มีในระบบ จึงไม่อนุญาตให้เขียนทับ")
    now = datetime.now().astimezone().isoformat(timespec="seconds")
    month = {
        "year": parsed["year"], "month": parsed["month"], "monthName": parsed["monthName"],
        "periodStart": parsed["periodStart"], "periodEnd": parsed["periodEnd"],
        "sourceFile": parsed["sourceFile"], "sourceHash": parsed["sourceHash"],
        "transactionCount": parsed["transactionCount"], "importedAt": now,
        "products": [
            {key: item[key] for key in ("productCode", "sourceCode", "name", "sales", "cn", "salesAmount", "cnAmount")}
            for item in parsed["products"]
        ],
    }
    state.setdefault("months", {})[parsed["monthKey"]] = month
    state.setdefault("importHistory", []).append({
        "monthKey": parsed["monthKey"], "monthName": parsed["monthName"], "periodEnd": parsed["periodEnd"],
        "sourceFile": parsed["sourceFile"], "sourceHash": parsed["sourceHash"], "importedAt": now,
        "transactionCount": parsed["transactionCount"], "sales": parsed["sales"], "cn": parsed["cn"], "net": parsed["net"],
    })
    return parsed


def generate_workbook(state, output_path):
    from openpyxl import Workbook
    from openpyxl.chart import LineChart, Reference
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    workbook = Workbook()
    workbook.remove(workbook.active)
    red, navy, blue, green, pale, border_color = "B51632", "14213D", "356BC4", "159B82", "F8FAFC", "D9E2EC"
    thin = Side(style="thin", color=border_color)
    months = [state["months"][key] for key in sorted(state.get("months", {}))]

    dashboard = workbook.create_sheet("Dashboard")
    dashboard.sheet_view.showGridLines = False
    dashboard.merge_cells("A1:H2")
    dashboard["A1"] = "สรุปยอดขายรายเดือน"
    dashboard["A1"].font = Font(name="Aptos Display", size=22, bold=True, color="FFFFFF")
    dashboard["A1"].fill = PatternFill("solid", fgColor=red)
    dashboard["A1"].alignment = Alignment(vertical="center")
    dashboard["A4"] = "ยอดขายรวม"
    dashboard["C4"] = "CN รวม"
    dashboard["E4"] = "ยอดสุทธิรวม"
    total_sales = sum(month_totals(month)[0] for month in months)
    total_cn = sum(month_totals(month)[1] for month in months)
    dashboard["A5"], dashboard["C5"], dashboard["E5"] = total_sales, total_cn, total_sales - total_cn
    for cell in ("A4", "C4", "E4"):
        dashboard[cell].font = Font(bold=True, color="64748B")
    for cell, color in (("A5", blue), ("C5", red), ("E5", green)):
        dashboard[cell].font = Font(size=18, bold=True, color=color)
        dashboard[cell].number_format = "#,##0"
    headers = ["เดือน", "ยอดขาย", "CN", "ยอดสุทธิ", "% CN"]
    dashboard.append([])
    dashboard.append(headers)
    for cell in dashboard[7]:
        cell.fill = PatternFill("solid", fgColor=navy)
        cell.font = Font(bold=True, color="FFFFFF")
    for month in months:
        sales, cn, net = month_totals(month)
        dashboard.append([f'{month.get("monthName", MONTH_NAMES[month["month"]])} {month["year"]}', sales, cn, net, cn / sales if sales else 0])
    dashboard.freeze_panes = "A8"
    dashboard.auto_filter.ref = f"A7:E{max(7, 7 + len(months))}"
    for row in dashboard.iter_rows(min_row=8, max_row=7 + len(months), min_col=2, max_col=4):
        for cell in row: cell.number_format = "#,##0"
    for cell in dashboard["E"][7:7 + len(months)]: cell.number_format = "0.00%"
    if months:
        chart = LineChart()
        chart.title = "แนวโน้มยอดขาย / CN / ยอดสุทธิ"
        chart.y_axis.title = "จำนวน"
        chart.x_axis.title = "เดือน"
        data = Reference(dashboard, min_col=2, max_col=4, min_row=7, max_row=7 + len(months))
        cats = Reference(dashboard, min_col=1, min_row=8, max_row=7 + len(months))
        chart.add_data(data, titles_from_data=True)
        chart.set_categories(cats)
        chart.height = 8
        chart.width = 16
        dashboard.add_chart(chart, "G4")
    for col, width in {"A": 24, "B": 16, "C": 16, "D": 16, "E": 14, "F": 4, "G": 16, "H": 16}.items():
        dashboard.column_dimensions[col].width = width

    combined = workbook.create_sheet("สรุปรวมรายการสินค้า")
    combined.sheet_view.showGridLines = False
    combined.append(["รหัสสินค้า", "รหัสต้นทาง", "รายการสินค้า", "ยอดขาย", "CN", "ยอดสุทธิ", "% CN", "สัดส่วนยอดขาย"])
    combined_month_sales = sum(month_totals(month)[0] for month in months)
    aggregates = {}
    for month in months:
        for item in month.get("products", []):
            target = aggregates.setdefault(item["productCode"], {**item, "sales": 0, "cn": 0})
            target["sales"] += item.get("sales", 0)
            target["cn"] += item.get("cn", 0)
    for item in sorted(aggregates.values(), key=lambda value: value["sales"] - value["cn"], reverse=True):
        combined.append([item["productCode"], item.get("sourceCode", ""), item["name"], item["sales"], item["cn"], item["sales"] - item["cn"], item["cn"] / item["sales"] if item["sales"] else 0, item["sales"] / combined_month_sales if combined_month_sales else 0])

    database = workbook.create_sheet("ฐานข้อมูลสรุป")
    database.sheet_view.showGridLines = False
    database.append(["ปี", "เดือน", "ชื่อเดือน", "ประเภท", "รหัสสินค้า", "รหัสต้นทาง", "รายการสินค้า", "จำนวน", "ยอดเงิน"])
    for month in months:
        for item in month.get("products", []):
            database.append([month["year"], month["month"], month.get("monthName", MONTH_NAMES[month["month"]]), "ขาย", item["productCode"], item.get("sourceCode", ""), item["name"], item.get("sales", 0), item.get("salesAmount", 0)])
            database.append([month["year"], month["month"], month.get("monthName", MONTH_NAMES[month["month"]]), "CN", item["productCode"], item.get("sourceCode", ""), item["name"], item.get("cn", 0), item.get("cnAmount", 0)])

    for month in months:
        sheet_name = month.get("monthName", MONTH_NAMES[month["month"]])
        if sheet_name in workbook.sheetnames:
            sheet_name = f'{sheet_name} {month["year"]}'
        sheet = workbook.create_sheet(sheet_name)
        sheet.sheet_view.showGridLines = False
        sheet.append(["รหัสสินค้า", "รหัสต้นทาง", "รายการสินค้า", "ยอดขาย", "CN", "ยอดสุทธิ", "% CN", "สัดส่วนยอดขาย", "ต่างจากเดือนก่อน", "% เปลี่ยนแปลง"])
        sales, _, _ = month_totals(month)
        previous_key = f'{month["year"]:04d}-{month["month"] - 1:02d}' if month["month"] > 1 else f'{month["year"] - 1:04d}-12'
        previous = {item["productCode"]: item for item in state.get("months", {}).get(previous_key, {}).get("products", [])}
        for item in month.get("products", []):
            prev = previous.get(item["productCode"], {})
            prev_net = prev.get("sales", 0) - prev.get("cn", 0)
            net = item.get("sales", 0) - item.get("cn", 0)
            sheet.append([item["productCode"], item.get("sourceCode", ""), item["name"], item.get("sales", 0), item.get("cn", 0), net, item.get("cn", 0) / item.get("sales", 1) if item.get("sales", 0) else 0, item.get("sales", 0) / sales if sales else 0, net - prev_net, (net - prev_net) / prev_net if prev_net else None])

    for sheet in workbook.worksheets[1:]:
        sheet.freeze_panes = "A2"
        sheet.auto_filter.ref = sheet.dimensions
        for cell in sheet[1]:
            cell.fill = PatternFill("solid", fgColor=navy)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.alignment = Alignment(horizontal="center")
        for row in sheet.iter_rows(min_row=2):
            for cell in row:
                cell.border = Border(bottom=thin)
        sheet.column_dimensions["A"].width = 14
        sheet.column_dimensions["B"].width = 15
        sheet.column_dimensions["C"].width = 48
        for index in range(4, sheet.max_column + 1):
            sheet.column_dimensions[get_column_letter(index)].width = 16
        if sheet.title == "ฐานข้อมูลสรุป":
            for cell in sheet["H"][1:]:
                cell.number_format = "#,##0"
            for cell in sheet["I"][1:]:
                cell.number_format = "#,##0.00"
        else:
            for row in sheet.iter_rows(min_row=2, min_col=4):
                for cell in row:
                    cell.number_format = (
                        "0.00%"
                        if cell.column in (7, 8, 10)
                        else "#,##0"
                    )

    with tempfile.TemporaryDirectory(prefix="valueplus-monthly-sales-") as folder:
        temp_path = Path(folder) / output.name
        workbook.save(temp_path)
        shutil.copy2(temp_path, output)
    return str(output)


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--operation", choices=("summary", "preview", "import"), required=True)
    parser.add_argument("--csv")
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--seed")
    parser.add_argument("--workbook", required=True)
    parser.add_argument("--selected-month")
    args = parser.parse_args(argv)
    state, state_path = load_state(args.data_dir, args.seed)

    if args.operation == "summary":
        respond(build_summary(state, args.selected_month, args.workbook))
        return 0
    if not args.csv:
        raise ValueError("กรุณาเลือกไฟล์ CSV")
    if args.operation == "preview":
        respond(preview(args.csv, state))
        return 0

    parsed = import_snapshot(args.csv, state)
    workbook_path = generate_workbook(state, args.workbook)
    save_json_atomic(state_path, state)
    result = build_summary(state, parsed["monthKey"], workbook_path)
    result["imported"] = parsed
    respond(result)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        respond(message=str(error), success=False)
        raise SystemExit(1)
