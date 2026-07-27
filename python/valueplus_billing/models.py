from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(slots=True)
class ProductItem:
    cpall_code: str
    barcode: str
    pdf_name: str
    quantity: float
    unit_price: float
    express_code: str = ""
    express_input_code: str = ""
    match_status: str = "unmatched"
    match_method: str = ""
    match_score: float = 0.0
    excluded: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class PurchaseOrder:
    po_number: str
    po_date: str
    express_date: str
    warehouse_code: str
    warehouse_text: str
    warehouse_group: str = ""
    warehouse_sequence: int = 0
    sales_area_code: str = ""
    iv_number: str = ""
    items: list[ProductItem] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def ready(self) -> bool:
        active_items = [item for item in self.items if not item.excluded]
        return (
            bool(self.po_number)
            and bool(self.express_date)
            and bool(self.sales_area_code)
            and bool(active_items)
            and all(
                item.match_status in {"matched", "matched_name"}
                for item in active_items
            )
        )

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["ready"] = self.ready
        return payload
