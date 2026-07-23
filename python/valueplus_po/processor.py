import math
import re
from collections import defaultdict
from pathlib import Path

from .constants import (
    DATE_HEADER_CELL,
    DELIVERY_DATE_CELL,
    IV_CELL,
    PO_CELL,
    PRODUCT_FIRST_ROW,
    PRODUCT_LAST_ROW,
    TARGET_SHEET_OVERRIDES,
    WAREHOUSE_PRIORITY,
)
from .models import PoPreview
from .pdf_parser import parse_pdf
from .product_matcher import match_products
from .template_reader import read_template
from .xlsx_writer import (
    thai_date_to_excel_serial,
    write_workbook,
)


class ProcessingError(ValueError):
    pass


def build_preview(
    pdf_path: str | Path,
    template_path: str | Path,
    start_iv: str,
) -> dict:
    iv_number = _validate_start_iv(
        start_iv,
    )

    documents = parse_pdf(
        pdf_path,
    )

    catalog = read_template(
        template_path,
    )

    priority = {
        name: index
        for index, name in enumerate(
            WAREHOUSE_PRIORITY,
        )
    }

    documents.sort(
        key=lambda document: (
            priority.get(
                document.warehouse,
                999,
            ),
            document.po_number,
        ),
    )

    warehouse_sequence = defaultdict(
        int,
    )

    previews = []
    assigned_sheets: set[str] = set()

    for (
        index,
        document,
    ) in enumerate(documents):
        warehouse_sequence[
            document.warehouse
        ] += 1

        sheet_sequence = (
            warehouse_sequence[
                document.warehouse
            ]
        )

        target_sheet = (
            _resolve_target_sheet(
                document.warehouse,
                sheet_sequence,
            )
        )

        current_iv = (
            f"VPR{iv_number + index}"
        )

        if (
            document.warehouse
            not in priority
        ):
            previews.append(
                PoPreview(
                    sequence=index + 1,
                    iv_number=current_iv,
                    po_number=(
                        document.po_number
                    ),
                    document_date=(
                        document.document_date
                    ),
                    warehouse=(
                        document.warehouse
                    ),
                    target_sheet=(
                        target_sheet
                    ),
                    pages=document.pages,
                    items=[],
                    status="error",
                    message=(
                        "ชื่อคลังไม่อยู่ใน"
                        "ลำดับคลังที่กำหนด"
                    ),
                ),
            )

            continue

        if (
            target_sheet
            not in catalog.sheet_names
        ):
            previews.append(
                PoPreview(
                    sequence=index + 1,
                    iv_number=current_iv,
                    po_number=(
                        document.po_number
                    ),
                    document_date=(
                        document.document_date
                    ),
                    warehouse=(
                        document.warehouse
                    ),
                    target_sheet=(
                        target_sheet
                    ),
                    pages=document.pages,
                    items=[],
                    status="error",
                    message=(
                        f"ไม่พบชีต "
                        f"{target_sheet} "
                        f"ใน Template"
                    ),
                ),
            )

            continue

        if (
            target_sheet
            in assigned_sheets
        ):
            previews.append(
                PoPreview(
                    sequence=index + 1,
                    iv_number=current_iv,
                    po_number=(
                        document.po_number
                    ),
                    document_date=(
                        document.document_date
                    ),
                    warehouse=(
                        document.warehouse
                    ),
                    target_sheet=(
                        target_sheet
                    ),
                    pages=document.pages,
                    items=[],
                    status="error",
                    message=(
                        f"ชีต {target_sheet} "
                        "ถูกใช้กับ PO อื่นแล้ว"
                    ),
                ),
            )

            continue

        matches = match_products(
            document.items,
            target_sheet,
            catalog,
        )

        unmatched_count = sum(
            not item.matched
            for item in matches
        )

        status = (
            "ready"
            if unmatched_count == 0
            else "review"
        )

        message = (
            ""
            if unmatched_count == 0
            else (
                f"มีสินค้า "
                f"{unmatched_count} "
                f"รายการที่ต้องตรวจสอบ"
            )
        )

        previews.append(
            PoPreview(
                sequence=index + 1,
                iv_number=current_iv,
                po_number=(
                    document.po_number
                ),
                document_date=(
                    document.document_date
                ),
                warehouse=(
                    document.warehouse
                ),
                target_sheet=(
                    target_sheet
                ),
                pages=document.pages,
                items=matches,
                status=status,
                message=message,
            ),
        )

        assigned_sheets.add(
            target_sheet,
        )

    preview_rows = [
        preview.to_dict()
        for preview in previews
    ]

    used_sheets = {
        preview.target_sheet
        for preview in previews
        if preview.status != "error"
    }

    unused_sheets = sorted(
        name
        for name in catalog.sheet_names
        if (
            name.casefold()
            != "data"
            and name
            not in used_sheets
        )
    )

    return {
        "start_iv": (
            f"VPR{iv_number}"
        ),
        "po_count": len(
            preview_rows,
        ),
        "ready_count": sum(
            row["status"] == "ready"
            for row in preview_rows
        ),
        "review_count": sum(
            row["status"] == "review"
            for row in preview_rows
        ),
        "error_count": sum(
            row["status"] == "error"
            for row in preview_rows
        ),
        "unused_sheets": (
            unused_sheets
        ),
        "records": preview_rows,
    }


def process_files(
    pdf_path: str | Path,
    template_path: str | Path,
    start_iv: str,
    output_path: str | Path,
    quantity_overrides: dict[
        str,
        int | float,
    ] | None = None,
) -> dict:
    preview = build_preview(
        pdf_path,
        template_path,
        start_iv,
    )

    if (
        preview["review_count"]
        or preview["error_count"]
    ):
        raise ProcessingError(
            "ยังสร้างไฟล์ Excel "
            "ไม่ได้ เพราะมีรายการ"
            "ที่ต้องตรวจสอบ",
        )

    _apply_quantity_overrides(
        preview["records"],
        quantity_overrides or {},
    )

    sheet_updates: dict[
        str,
        dict[
            str,
            str | int | float | None,
        ],
    ] = {}

    for record in preview[
        "records"
    ]:
        updates: dict[
            str,
            str | int | float | None,
        ] = {
            DATE_HEADER_CELL: (
                thai_date_to_excel_serial(
                    record[
                        "document_date"
                    ],
                )
            ),
            IV_CELL: record[
                "iv_number"
            ],
            PO_CELL: record[
                "po_number"
            ],
            DELIVERY_DATE_CELL: (
                thai_date_to_excel_serial(
                    record[
                        "document_date"
                    ],
                )
            ),
        }

        for row in range(
            PRODUCT_FIRST_ROW,
            PRODUCT_LAST_ROW + 1,
        ):
            updates[
                f"D{row}"
            ] = None

        for item in record[
            "items"
        ]:
            if (
                not item.get(
                    "matched",
                    False,
                )
                or item.get(
                    "excel_row",
                ) is None
                or float(
                    item.get(
                        "quantity",
                        0,
                    ),
                ) <= 0
            ):
                continue

            updates[
                f'D{item["excel_row"]}'
            ] = item["quantity"]

        sheet_updates[
            record["target_sheet"]
        ] = updates

    write_workbook(
        template_path,
        output_path,
        sheet_updates,
    )

    preview["output_path"] = str(
        Path(
            output_path,
        ).resolve(),
    )

    return preview



def _apply_quantity_overrides(
    records: list[dict],
    quantity_overrides: dict[
        str,
        int | float,
    ],
) -> None:
    for record in records:
        target_sheet = str(
            record.get(
                "target_sheet",
                "",
            ),
        )

        for item in record.get(
            "items",
            [],
        ):
            excel_row = item.get(
                "excel_row",
            )

            if (
                not item.get(
                    "matched",
                    False,
                )
                or excel_row is None
            ):
                continue

            barcode = str(
                item.get(
                    "barcode",
                    "",
                ),
            )

            key = (
                f"{target_sheet}|"
                f"{excel_row}|"
                f"{barcode}"
            )

            legacy_key = (
                f"{target_sheet}|"
                f"{excel_row}"
            )

            if key in quantity_overrides:
                raw_quantity = (
                    quantity_overrides[
                        key
                    ]
                )
            elif (
                legacy_key
                in quantity_overrides
            ):
                raw_quantity = (
                    quantity_overrides[
                        legacy_key
                    ]
                )
            else:
                continue

            try:
                quantity = float(
                    raw_quantity,
                )
            except (
                TypeError,
                ValueError,
            ) as error:
                raise ProcessingError(
                    "จำนวนที่ตัดยอด"
                    f"ไม่ถูกต้อง: {key}",
                ) from error

            if (
                not math.isfinite(
                    quantity,
                )
                or quantity < 0
            ):
                raise ProcessingError(
                    "จำนวนที่ตัดยอด"
                    f"ไม่ถูกต้อง: {key}",
                )

            original_quantity = (
                item.get(
                    "original_quantity",
                    item.get(
                        "quantity",
                        0,
                    ),
                )
            )

            item[
                "original_quantity"
            ] = original_quantity
            item[
                "quantity"
            ] = _clean_quantity(
                quantity,
            )
            item[
                "adjusted"
            ] = True
            item[
                "excluded"
            ] = quantity == 0


def _clean_quantity(
    quantity: float,
) -> int | float:
    rounded = round(
        quantity,
        6,
    )

    if rounded.is_integer():
        return int(
            rounded,
        )

    return rounded

def _resolve_target_sheet(
    warehouse: str,
    sheet_sequence: int,
) -> str:
    override = (
        TARGET_SHEET_OVERRIDES.get(
            warehouse,
        )
    )

    if override:
        return override

    return (
        f"{warehouse}"
        f"({sheet_sequence})"
    )


def _validate_start_iv(
    raw_value: str,
) -> int:
    value = str(
        raw_value or "",
    ).strip().upper()

    value = re.sub(
        r"^VPR",
        "",
        value,
    )

    if not re.fullmatch(
        r"\d+",
        value,
    ):
        raise ProcessingError(
            "เลข IV ต้องเป็น"
            "ตัวเลขเท่านั้น",
        )

    return int(
        value,
    )