import re
from collections import OrderedDict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import pdfplumber
from pypdf import PdfReader, PdfWriter

PO_PATTERN = re.compile(r"เลขที่\s*:\s*([A-Z]\d+)")
DATE_PATTERN = re.compile(r"วันที่\s*:\s*(\d{1,2})/(\d{1,2})/(\d{4})")
WAREHOUSE_PATTERN = re.compile(
    r"(?:คลัง|ศูนย์กระจายสินค้า)\s+BDC\s+(.+?)(?:\s+คลังดี|\s+อ้างถึง|\n)",
)
PRODUCT_CODE_PATTERN = re.compile(r"\b6\d{6}\s*/")
BARCODE_PATTERN = re.compile(r"\b\d{13}\b")
ITEM_ROW_PATTERN = re.compile(
    r"^\s*\d+\s+\d{13}\s+.+$",
    re.MULTILINE,
)

THAI_MONTHS = {
    1: "มกราคม",
    2: "กุมภาพันธ์",
    3: "มีนาคม",
    4: "เมษายน",
    5: "พฤษภาคม",
    6: "มิถุนายน",
    7: "กรกฎาคม",
    8: "สิงหาคม",
    9: "กันยายน",
    10: "ตุลาคม",
    11: "พฤศจิกายน",
    12: "ธันวาคม",
}

LogCallback = Callable[[str, str], None]


class PdfSplitError(ValueError):
    pass


@dataclass
class SplitDocument:
    po_number: str
    document_date: str = ""
    warehouse: str = ""
    item_pages: list[int] = field(default_factory=list)
    skipped_pages: list[int] = field(default_factory=list)


def split_po_pdf(
    pdf_path: str | Path,
    output_base: str | Path,
    log: LogCallback | None = None,
) -> dict:
    source_path = Path(pdf_path).resolve()
    base_folder = Path(output_base).resolve()

    if not source_path.is_file():
        raise PdfSplitError(f"ไม่พบไฟล์ PDF: {source_path}")

    _emit(log, "info", f"กำลังอ่านไฟล์ {source_path.name}")
    documents, total_pages = _inspect_pages(source_path, log)

    if not documents:
        raise PdfSplitError("ไม่พบเลข PO ในไฟล์ PDF")

    _apply_special_warehouse_names(
        documents,
        log,
    )

    reader = PdfReader(str(source_path))
    results = []
    created_count = 0
    skipped_page_count = 0
    duplicate_count = 0
    duplicate_folders: list[str] = []
    output_folders: list[str] = []

    for document in documents.values():
        skipped_page_count += len(document.skipped_pages)

        if not document.item_pages:
            message = "ไม่พบหน้าที่มีรายการสินค้า ระบบจึงไม่สร้างไฟล์"
            _emit(log, "warning", f"ข้าม {document.po_number}: {message}")
            results.append(_document_result(document, "skipped", message, ""))
            continue

        if not document.document_date:
            message = "ไม่พบวันที่ในเอกสาร PO"
            _emit(log, "error", f"ข้าม {document.po_number}: {message}")
            results.append(_document_result(document, "error", message, ""))
            continue

        if not document.warehouse:
            message = "ไม่พบชื่อคลังในเอกสาร PO"
            _emit(log, "error", f"ข้าม {document.po_number}: {message}")
            results.append(_document_result(document, "error", message, ""))
            continue

        output_folder = _build_output_folder(base_folder, document.document_date)
        output_folder.mkdir(parents=True, exist_ok=True)

        output_folder_text = str(
            output_folder,
        )

        if output_folder_text not in output_folders:
            output_folders.append(
                output_folder_text,
            )

        safe_warehouse = _sanitize_filename(document.warehouse)
        requested_path = (
            output_folder
            / f"{document.po_number} {safe_warehouse}.pdf"
        )

        duplicate_detected = requested_path.exists()

        if duplicate_detected:
            duplicate_count += 1

            folder_text = str(
                output_folder,
            )

            if folder_text not in duplicate_folders:
                duplicate_folders.append(
                    folder_text,
                )

            _emit(
                log,
                "warning",
                f"พบไฟล์ซ้ำ: {requested_path.name} "
                "ระบบข้ามไฟล์นี้และจะไม่สร้างไฟล์ซ้ำ",
            )

            results.append(
                _document_result(
                    document,
                    "duplicate",
                    "พบไฟล์เดิมในโฟลเดอร์ปลายทาง",
                    str(requested_path),
                    True,
                ),
            )

            continue

        output_path = requested_path

        pages_text = ", ".join(str(page) for page in document.item_pages)
        _emit(
            log,
            "info",
            f"กำลังแยก {document.po_number} {document.warehouse} จากหน้าที่ {pages_text}",
        )

        writer = PdfWriter()
        for page_number in document.item_pages:
            writer.add_page(reader.pages[page_number - 1])

        with output_path.open("wb") as output_file:
            writer.write(output_file)

        created_count += 1
        _emit(log, "success", f"บันทึกแล้ว: {output_path}")
        results.append(
            _document_result(
                document,
                "created",
                "",
                str(output_path),
                duplicate_detected,
            ),
        )

    _emit(
        log,
        "success",
        f"เสร็จสิ้น สร้างไฟล์ {created_count} รายการ จาก PO ทั้งหมด {len(documents)} รายการ",
    )

    return {
        "source_path": str(source_path),
        "output_base": str(base_folder),
        "total_pages": total_pages,
        "po_count": len(documents),
        "created_count": created_count,
        "skipped_page_count": skipped_page_count,
        "duplicate_count": duplicate_count,
        "duplicate_folders": duplicate_folders,
        "output_folders": output_folders,
        "records": results,
    }


def _inspect_pages(
    source_path: Path,
    log: LogCallback | None,
) -> tuple[OrderedDict[str, SplitDocument], int]:
    documents: OrderedDict[str, SplitDocument] = OrderedDict()

    with pdfplumber.open(source_path) as pdf:
        total_pages = len(pdf.pages)
        _emit(log, "info", f"ตรวจพบเอกสารทั้งหมด {total_pages} หน้า")

        for page_number, page in enumerate(pdf.pages, start=1):
            _emit(
                log,
                "progress",
                f"กำลังอ่านไฟล์ {page_number} / {total_pages}",
            )

            text = page.extract_text(layout=True) or ""
            po_match = PO_PATTERN.search(text)

            if not po_match:
                continue

            po_number = po_match.group(1).strip()
            date_match = DATE_PATTERN.search(text)
            warehouse_match = WAREHOUSE_PATTERN.search(text)

            document = documents.setdefault(
                po_number,
                SplitDocument(po_number=po_number),
            )

            if not document.document_date and date_match:
                day, month, year = date_match.groups()
                document.document_date = f"{int(day):02d}/{int(month):02d}/{year}"

            if not document.warehouse and warehouse_match:
                document.warehouse = _normalize_warehouse_name(
                    warehouse_match.group(1).strip(),
                )

            item_count = _count_item_rows(text)
            if item_count > 0:
                document.item_pages.append(page_number)
            else:
                document.skipped_pages.append(page_number)

    return documents, total_pages


def _count_item_rows(text: str) -> int:
    row_matches = ITEM_ROW_PATTERN.findall(text)
    if row_matches:
        return len(row_matches)

    product_codes = PRODUCT_CODE_PATTERN.findall(text)
    barcodes = BARCODE_PATTERN.findall(text)
    return min(len(product_codes), len(barcodes))


def _build_output_folder(base_folder: Path, document_date: str) -> Path:
    day_text, month_text, year_text = document_date.split("/")
    month = int(month_text)

    if month not in THAI_MONTHS:
        raise PdfSplitError(f"เดือนไม่ถูกต้อง: {document_date}")

    return base_folder / year_text / THAI_MONTHS[month] / f"{int(day_text):02d}"


def _sanitize_filename(value: str) -> str:
    cleaned = re.sub(r'[<>:"/\\|?*]+', " ", value)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .")
    return cleaned or "ไม่ทราบคลัง"


def _normalize_warehouse_name(raw_value: str) -> str:
    value = (raw_value or "").replace("\u0e4d\u0e32", "\u0e33")
    value = re.sub(r"[_\s]+", " ", value).strip()
    value = re.sub(r"\s*คลังดี\s*$", "", value).strip()
    value = re.sub(
        r"^(?:คลัง|ศูนย์กระจายสินค้า)\s+BDC\s*",
        "",
        value,
    ).strip()
    value = re.sub(r"^BDC[.\s]*", "", value).strip()
    return value


def _apply_special_warehouse_names(
    documents: OrderedDict[str, SplitDocument],
    log: LogCallback | None,
) -> None:
    warehouse_sequences: dict[str, int] = {}

    for document in documents.values():
        base_name = _remove_lao_suffix(
            document.warehouse,
        )

        if not base_name:
            continue

        warehouse_key = re.sub(
            r"\s+",
            "",
            base_name,
        )

        sequence = (
            warehouse_sequences.get(
                warehouse_key,
                0,
            )
            + 1
        )

        warehouse_sequences[
            warehouse_key
        ] = sequence

        is_lao_po = (
            warehouse_key == "เชียงใหม่"
            and sequence == 2
        ) or (
            warehouse_key == "ขอนแก่น"
            and sequence == 3
        )

        if is_lao_po:
            document.warehouse = (
                f"{base_name} ( ลาว )"
            )

            _emit(
                log,
                "info",
                f"{document.po_number}: "
                f"ตรวจพบ {base_name} PO ลำดับที่ {sequence} "
                "กำหนดเป็นเอกสารลาว",
            )
        else:
            document.warehouse = base_name


def _remove_lao_suffix(
    warehouse_name: str,
) -> str:
    value = warehouse_name.strip()

    value = re.sub(
        r"\s*\(\s*(?:LAOS|ลาว)\s*\)\s*$",
        "",
        value,
        flags=re.IGNORECASE,
    )

    return value.strip()


def _document_result(
    document: SplitDocument,
    status: str,
    message: str,
    output_path: str,
    duplicate_detected: bool = False,
) -> dict:
    return {
        "po_number": document.po_number,
        "warehouse": document.warehouse,
        "document_date": document.document_date,
        "item_pages": document.item_pages,
        "skipped_pages": document.skipped_pages,
        "output_path": output_path,
        "status": status,
        "message": message,
        "duplicate_detected": duplicate_detected,
    }


def _emit(log: LogCallback | None, level: str, message: str) -> None:
    if log is not None:
        log(level, message)
