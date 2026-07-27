from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from typing import Any

from .models import PurchaseOrder


@dataclass(slots=True)
class KeyAction:
    action: str
    value: str | int = ""
    note: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def increment_iv(start_iv: str, offset: int) -> str:
    match = re.fullmatch(r"(.*?)(\d+)", start_iv.strip())
    if not match:
        raise ValueError("เลข IV ต้องลงท้ายด้วยตัวเลข เช่น VPR6907001")
    prefix, digits = match.groups()
    return f"{prefix}{int(digits) + offset:0{len(digits)}d}"


def assign_iv_numbers(orders: list[PurchaseOrder], start_iv: str) -> None:
    for index, order in enumerate(orders):
        order.iv_number = increment_iv(start_iv, index)


def build_order_plan(order: PurchaseOrder) -> list[KeyAction]:
    if not order.ready:
        raise ValueError(f"PO {order.po_number} ยังไม่พร้อมคีย์")

    actions = [
        KeyAction("hotkey", "alt+a", "สร้าง IV ใหม่"),
        KeyAction("press", "enter", "ไปช่องเลขที่เอกสาร"),
        KeyAction("write", order.iv_number, "เลข IV"),
        KeyAction("press", "enter", "ไปช่องวันที่"),
        KeyAction("write", order.express_date, "วันที่ 6 หลัก"),
        KeyAction("press", "enter", "ไปช่องลูกค้า"),
        KeyAction("write", "MT001", "รหัสลูกค้าคงที่"),
        KeyAction("press_many", 4, "ไปช่องอ้างอิง"),
        KeyAction("write", order.po_number, "เลข PO"),
        KeyAction("press_many", 4, "ไปช่องเขตการขาย"),
        KeyAction("write", order.sales_area_code, "รหัสเขตการขาย"),
        KeyAction("press_many", 8, "ไปช่องรหัสสินค้า"),
    ]

    active_items = [item for item in order.items if not item.excluded]
    for index, item in enumerate(active_items):
        actions.extend(
            [
                KeyAction("write", item.express_input_code, "รหัสสินค้า"),
                KeyAction("press_many", 2, "ไปช่องคลัง"),
                KeyAction("hotkey", "ctrl+a", "เลือกค่าคลังเดิม"),
                KeyAction("write", "02", "คลังสินค้า"),
                KeyAction("press", "enter", "ไปช่องจำนวน"),
                KeyAction("write", f"{item.quantity:.2f}", "จำนวน"),
                KeyAction("press_many", 3, "ไปช่องราคาต่อหน่วย"),
                KeyAction("write", f"{item.unit_price:.2f}", "ราคา"),
                KeyAction("press_many", 3, "ยืนยันบรรทัดสินค้าและลงบรรทัดใหม่"),
            ]
        )

    actions.append(KeyAction("press_esc_many", 2, "กด Esc 2 ครั้งเพื่อบันทึก IV"))
    return actions
