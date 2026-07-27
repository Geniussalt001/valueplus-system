from __future__ import annotations

from .models import PurchaseOrder


def po_numbers_from_start_index(
    orders: list[PurchaseOrder],
    start_index: int,
) -> set[str]:
    """Logic START INDEX แบบระบบเก่า: เริ่ม index นี้จนถึงใบสุดท้าย."""
    if not 0 <= start_index < len(orders):
        raise ValueError(
            f"INDEX ต้องอยู่ระหว่าง 0 ถึง {max(0, len(orders) - 1)}"
        )
    return {order.po_number for order in orders[start_index:]}
