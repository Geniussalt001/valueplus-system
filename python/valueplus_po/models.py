from dataclasses import asdict, dataclass, field


@dataclass
class PdfItem:
    line_number: int
    barcode: str
    pdf_name: str
    quantity: float
    page_number: int


@dataclass
class PoDocument:
    po_number: str
    document_date: str
    warehouse_raw: str
    warehouse: str = ""
    pages: list[int] = field(default_factory=list)
    items: list[PdfItem] = field(default_factory=list)


@dataclass
class ProductMatch:
    barcode: str
    pdf_name: str
    data_name: str | None
    target_name: str | None
    excel_row: int | None
    quantity: float
    matched: bool
    message: str = ""


@dataclass
class PoPreview:
    sequence: int
    iv_number: str
    po_number: str
    document_date: str
    warehouse: str
    target_sheet: str
    pages: list[int]
    items: list[ProductMatch]
    status: str
    message: str = ""

    def to_dict(self) -> dict:
        result = asdict(self)
        result["matched_count"] = sum(item.matched for item in self.items)
        result["item_count"] = len(self.items)
        return result

