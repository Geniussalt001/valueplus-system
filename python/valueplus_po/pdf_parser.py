import re
from collections import OrderedDict
from pathlib import Path

import pdfplumber

from .models import PdfItem, PoDocument
from .normalizers import normalize_warehouse


PO_PATTERN = re.compile(r"เลขที่\s*:\s*([A-Z]\d+)")
DATE_PATTERN = re.compile(r"วันที่\s*:\s*(\d{2}/\d{2}/\d{4})")
WAREHOUSE_PATTERN = re.compile(
    r"(?:คลัง|ศูนย์กระจายสินค้า)\s+BDC\s+(.+?)(?:\s+คลังดี|\s+อ้างถึง|\n)",
)
ITEM_PATTERN = re.compile(
    r"^\s*(\d+)\s+(\d{13})\s+(.+?)\s+1\s+([\d,]+\.\d{2})\s+0\s+",
    re.MULTILINE,
)
WRAPPED_DECIMAL_PATTERN = re.compile(
    r"(?<![\d,])(\d[\d,]*)\.(?!\d)",
)


class PdfParseError(ValueError):
    pass


def _normalize_wrapped_decimal_values(text: str) -> str:
    """Join decimal digits that JasperReports wraps onto the next line."""
    lines = text.splitlines()

    for index in range(1, len(lines)):
        decimal_digits = lines[index].strip()
        if not re.fullmatch(r"\d{2}", decimal_digits):
            continue

        previous_line = lines[index - 1]
        matches = list(
            WRAPPED_DECIMAL_PATTERN.finditer(previous_line),
        )
        if not matches:
            continue

        wrapped_number = matches[-1]
        lines[index - 1] = (
            previous_line[:wrapped_number.end()]
            + decimal_digits
            + previous_line[wrapped_number.end():]
        )
        lines[index] = ""

    return "\n".join(lines)


def parse_pdf(pdf_path: str | Path) -> list[PoDocument]:
    path = Path(pdf_path)
    if not path.is_file():
        raise PdfParseError(f"ไม่พบไฟล์ PDF: {path}")

    po_map: OrderedDict[str, PoDocument] = OrderedDict()

    with pdfplumber.open(path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            text = _normalize_wrapped_decimal_values(
                page.extract_text(layout=True) or "",
            )
            po_match = PO_PATTERN.search(text)

            if not po_match:
                continue

            po_number = po_match.group(1).strip()
            date_match = DATE_PATTERN.search(text)
            warehouse_match = WAREHOUSE_PATTERN.search(text)

            if po_number not in po_map:
                warehouse_raw = warehouse_match.group(1).strip() if warehouse_match else ""
                po_map[po_number] = PoDocument(
                    po_number=po_number,
                    document_date=date_match.group(1) if date_match else "",
                    warehouse_raw=warehouse_raw,
                    warehouse=normalize_warehouse(warehouse_raw),
                )

            document = po_map[po_number]
            document.pages.append(page_number)

            if not document.document_date and date_match:
                document.document_date = date_match.group(1)

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
