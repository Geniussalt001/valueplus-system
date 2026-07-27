from __future__ import annotations

import json
import re
from collections import defaultdict

from .models import PurchaseOrder
from .runtime_paths import warehouse_db_path


WAREHOUSE_DB_PATH = warehouse_db_path()


def to_express_sales_area_code(value: str) -> str:
    """แปลงรหัสฐานข้อมูล CP001 เป็นรหัสที่ช่อง Express รับจริง CP01."""
    text = str(value or "").strip().upper()
    match = re.fullmatch(r"CP0(\d{2})", text)
    if match:
        return f"CP{match.group(1)}"
    return text


def load_warehouse_rows() -> list[dict]:
    payload = json.loads(WAREHOUSE_DB_PATH.read_text(encoding="utf-8"))
    return [
        row
        for row in payload.get("warehouses", [])
        if row.get("active", True)
    ]


def save_warehouse_rows(rows: list[dict]) -> None:
    WAREHOUSE_DB_PATH.write_text(
        json.dumps(
            {"version": 1, "warehouses": rows},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def normalize_warehouse(text: str) -> tuple[str, list[str]]:
    normalized = re.sub(r"[_\s]+", " ", text).strip()
    rows = load_warehouse_rows()
    matched_groups: list[str] = []
    for row in rows:
        aliases = row.get("aliases", [])
        if any(alias and alias in normalized for alias in aliases):
            group = str(row["group"])
            if group not in matched_groups:
                matched_groups.append(group)
    if not matched_groups:
        return "", []
    group = matched_groups[0]
    codes = [
        str(row["sales_area_code"])
        for row in sorted(
            (row for row in rows if row["group"] == group),
            key=lambda row: int(row["sequence"]),
        )
    ]
    return group, codes


def assign_sales_areas(orders: list[PurchaseOrder]) -> None:
    grouped: dict[str, list[PurchaseOrder]] = defaultdict(list)
    for order in orders:
        order.warnings = [
            warning
            for warning in order.warnings
            if not warning.startswith("ไม่พบกฎคลัง")
            and "รหัสเขตการขาย" not in warning
        ]
        order.sales_area_code = ""
        group, _ = normalize_warehouse(order.warehouse_text)
        order.warehouse_group = group
        if not group:
            order.warnings.append(
                f"ไม่พบกฎคลังจากข้อความ: {order.warehouse_text}"
            )
            continue
        grouped[group].append(order)

    for group, group_orders in grouped.items():
        group_orders.sort(key=lambda order: order.po_number)
        _, area_codes = normalize_warehouse(group_orders[0].warehouse_text)
        for index, order in enumerate(group_orders):
            order.warehouse_sequence = index + 1
            if index >= len(area_codes):
                order.warnings.append(
                    f"จำนวน PO ของคลัง {group} มากกว่ารหัสเขตการขายที่กำหนด"
                )
                continue
            order.sales_area_code = to_express_sales_area_code(
                area_codes[index]
            )
