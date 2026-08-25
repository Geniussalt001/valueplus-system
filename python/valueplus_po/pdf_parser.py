import re
from collections import OrderedDict
from pathlib import Path

import pdfplumber

from valueplus_common.cpall_pdf import (
    normalize_wrapped_item_quantities,
)

from .models import PdfItem, PoDocument
from .normalizers import normalize_cpall_cid_text, normalize_warehouse


PO_PATTERN = re.compile(r"เลขที่\s*:\s*([A-Z]\d+)")
PO_FALLBACK_PATTERN = re.compile(r"\bB\d{9}\b")
DATE_PATTERN = re.compile(
    r"วันที่\s*:\s*(\d{2}/\d{2}/(?:\d{4}|\d{2}))\b",
)
DATE_FALLBACK_PATTERN = re.compile(
    r"\b\d{2}/\d{2}/(?:\d{4}|\d{2})\b",
)
WAREHOUSE_PATTERN = re.compile(
    r"(?:คลัง|ศูนย์กระจายสินค้า)\s+BDC\s+(.+?)(?:\s+คลังดี|\s+อ้างถึง|\n)",
)
# The original CP ALL export contains a 13-digit barcode. The compact
# ReportPO export uses the 7-digit CP ALL product code in the same position.
ITEM_PATTERN = re.compile(
    r"^\s*(\d+)\s+(\d{7}|\d{13})\s+(.+?)\s+1\s+([\d,]+\.\d{2})\s+0\s+",
    re.MULTILINE,
)


class PdfParseError(ValueError):
    pass


def _normalize_wrapped_decimal_values(text: str) -> str:
    """Backward-compatible alias for the shared CP ALL normalizer."""
    return normalize_wrapped_item_quantities(text)


def _match_value(match: re.Match | None) -> str:
    if not match:
        return ""

    return (
        match.group(1)
        if match.lastindex
        else match.group(0)
    ).strip()


def _normalize_document_date(value: str) -> str:
    if not value:
        return ""

    day, month, year = value.split("/")

    # ReportPO uses Buddhist year with two digits (69 => 2569).
    if len(year) == 2:
        year = str(2500 + int(year))

    return f"{day}/{month}/{year}"


def parse_pdf(pdf_path: str | Path) -> list[PoDocument]:
    path = Path(pdf_path)
    if not path.is_file():
        raise PdfParseError(f"ไม่พบไฟล์ PDF: {path}")

    po_map: OrderedDict[str, PoDocument] = OrderedDict()

    with pdfplumber.open(path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            # Some Microsoft Reporting Services PDFs expose Thai marks as
            # literal (cid:xxxx) placeholders. Restore them before applying
            # the same patterns used by the original CP ALL export.
            text = normalize_cpall_cid_text(
                page.extract_text(layout=True) or "",
            )
            text = _normalize_wrapped_decimal_values(text)

            po_match = (
                PO_PATTERN.search(text)
                or PO_FALLBACK_PATTERN.search(text)
            )

            if not po_match:
                continue

            po_number = _match_value(po_match)
            date_match = (
                DATE_PATTERN.search(text)
                or DATE_FALLBACK_PATTERN.search(text)
            )
            warehouse_match = WAREHOUSE_PATTERN.search(text)
            document_date = _normalize_document_date(
                _match_value(date_match),
            )

            if po_number not in po_map:
                warehouse_raw = warehouse_match.group(1).strip() if warehouse_match else ""
                po_map[po_number] = PoDocument(
                    po_number=po_number,
                    document_date=document_date,
                    warehouse_raw=warehouse_raw,
                    warehouse=normalize_warehouse(warehouse_raw),
                )

            document = po_map[po_number]
            document.pages.append(page_number)

            if not document.document_date and document_date:
                document.document_date = document_date

            if not document.warehouse and warehouse_match:
                document.warehouse_raw = warehouse_match.group(1).strip()
                document.warehouse = normalize_warehouse(document.warehouse_raw)

            for match in ITEM_PATTERN.finditer(text):
                document.items.append(
                    PdfItem(
                        line_number=int(match.group(1)),
                        barcode=match.group(2),
                        pdf_name=" ".join(match.group(3).split()),
                        quantity=float(match.group(4).replace(",", "")),
                        page_number=page_number,
                    ),
                )

    documents = list(po_map.values())
    if not documents:
        raise PdfParseError("ไม่พบเลข PO ในไฟล์ PDF")

    return documents
