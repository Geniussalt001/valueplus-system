from __future__ import annotations

import re
from collections import OrderedDict
from datetime import datetime
from pathlib import Path

import pdfplumber

from .mappings import assign_sales_areas
from .models import ProductItem, PurchaseOrder
from .product_database import ProductDatabase


PO_PATTERN = re.compile(r"\bB\d{9}\b")
DATE_PATTERN = re.compile(r"วันที่\s*:\s*(\d{2}/\d{2}/\d{4})")
WAREHOUSE_PATTERN = re.compile(
    r"นำส่ง\s*:\s*(WB\d+)\s+(.+?)(?:\s{2,}อ้างถึง|\n)"
)
NUMBER_PATTERN = r"\d[\d,]*(?:\.\d+)?"
ITEM_PATTERN = re.compile(
    r"(?ms)^\s*(\d{7})\s*/\s+(?:INC|EXC|NON).*?\n"
    r"\s*\d+\s+(\d{13})\s+(.+?)\s+"
    rf"{NUMBER_PATTERN}\s+({NUMBER_PATTERN})\s+"
    rf"{NUMBER_PATTERN}\s+({NUMBER_PATTERN})\s+"
)


def _to_express_date(thai_date: str) -> str:
    parsed = datetime.strptime(thai_date, "%d/%m/%Y")
    return parsed.strftime("%d%m") + f"{parsed.year % 100:02d}"


def _clean_name(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _parse_number(value: str) -> float:
    return float(str(value).replace(",", "").strip())


def parse_pdf(
    pdf_path: Path,
    product_database: ProductDatabase,
) -> list[PurchaseOrder]:
    if not pdf_path.exists():
        raise FileNotFoundError(pdf_path)

    pages_by_po: OrderedDict[str, list[str]] = OrderedDict()

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text(x_tolerance=2, y_tolerance=3) or ""
            po_match = PO_PATTERN.search(text)
            if not po_match:
                continue
            pages_by_po.setdefault(po_match.group(0), []).append(text)

    orders: list[PurchaseOrder] = []
    for po_number, page_texts in pages_by_po.items():
        full_text = "\n".join(page_texts)
        first_page = page_texts[0]
        date_match = DATE_PATTERN.search(first_page)
        warehouse_match = WAREHOUSE_PATTERN.search(first_page)

        po_date = date_match.group(1) if date_match else ""
        warehouse_code = warehouse_match.group(1) if warehouse_match else ""
        warehouse_text = (
            _clean_name(warehouse_match.group(2)) if warehouse_match else ""
        )

        order = PurchaseOrder(
            po_number=po_number,
            po_date=po_date,
            express_date=_to_express_date(po_date) if po_date else "",
            warehouse_code=warehouse_code,
            warehouse_text=warehouse_text,
        )

        if not po_date:
            order.warnings.append("ไม่พบวันที่ PO")
        if not warehouse_text:
            order.warnings.append("ไม่พบชื่อคลัง")

        for match in ITEM_PATTERN.finditer(full_text):
            item = ProductItem(
                cpall_code=match.group(1),
                barcode=match.group(2),
                pdf_name=_clean_name(match.group(3)),
                quantity=_parse_number(match.group(4)),
                unit_price=_parse_number(match.group(5)),
            )
            product_database.apply(item)
            order.items.append(item)

        if not order.items:
            order.warnings.append("ไม่พบรายการสินค้า")

        unmatched = [
            item.cpall_code
            for item in order.items
            if item.match_status not in {"matched", "matched_name"}
        ]
        if unmatched:
            order.warnings.append(
                "ไม่มีรหัส Express: " + ", ".join(sorted(set(unmatched)))
            )

        orders.append(order)

    assign_sales_areas(orders)
    return orders
