import csv
import re
from collections import OrderedDict
from dataclasses import dataclass, field
from pathlib import Path


IV_PATTERN = re.compile(
    r"^IVVPR\d+$",
    re.IGNORECASE,
)

WAREHOUSE_SEQUENCE_PATTERN = re.compile(
    r"^(.*?)(\d+)\s*$",
)

WAREHOUSE_ORDER = [
    "มหาชัย",
    "สำโรง",
    "ร่มเกล้า",
    "ชลบุรี",
    "รังสิต",
    "โชคชัย",
    "เชียงใหม่",
    "นครสวรรค์",
    "ขอนแก่น",
    "โคราช",
    "หาดใหญ่",
    "สุราษฎร์ธานี",
]

CSV_ENCODINGS = (
    "utf-8-sig",
    "cp874",
)


class ExpressCsvError(ValueError):
    pass


@dataclass
class ExpressItem:
    product_code: str
    product_name: str
    quantity: float
    row_number: int


@dataclass
class ExpressInvoice:
    warehouse: str
    warehouse_label: str
    warehouse_sequence: int
    iv_number: str
    document_date: str
    row_number: int
    items: list[ExpressItem] = field(
        default_factory=list,
    )


def parse_express_csv(
    csv_path: str | Path,
) -> dict:
    source_path = Path(
        csv_path,
    ).resolve()

    if not source_path.is_file():
        raise ExpressCsvError(
            f"ไม่พบไฟล์ CSV: {source_path}",
        )

    if source_path.suffix.lower() != ".csv":
        raise ExpressCsvError(
            "กรุณาเลือกไฟล์ CSV เท่านั้น",
        )

    rows, encoding = _read_csv(
        source_path,
    )

    invoices = _extract_invoices(
        rows,
    )

    if not invoices:
        raise ExpressCsvError(
            "ไม่พบเลข IV ในรูปแบบ IVVPR ภายในไฟล์ CSV",
        )

    invoices.sort(
        key=_iv_sort_key,
    )

    warehouse_results = _build_warehouse_results(
        invoices,
    )

    product_results = _build_product_results(
        invoices,
    )

    document_dates = list(
        OrderedDict.fromkeys(
            invoice.document_date
            for invoice in invoices
            if invoice.document_date
        ),
    )

    total_quantity = sum(
        item.quantity
        for invoice in invoices
        for item in invoice.items
    )

    return {
        "source_path": str(
            source_path,
        ),
        "encoding": encoding,
        "document_dates": document_dates,
        "iv_count": len(
            invoices,
        ),
        "warehouse_count": sum(
            1
            for warehouse in warehouse_results
            if warehouse["iv_count"] > 0
        ),
        "item_line_count": sum(
            len(invoice.items)
            for invoice in invoices
        ),
        "product_count": len(
            product_results,
        ),
        "total_quantity": _clean_number(
            total_quantity,
        ),
        "warehouses": warehouse_results,
        "products": product_results,
        "invoices": [
            _invoice_result(
                invoice,
            )
            for invoice in invoices
        ],
    }


def _read_csv(
    source_path: Path,
) -> tuple[list[list[str]], str]:
    decode_errors = []

    for encoding in CSV_ENCODINGS:
        try:
            with source_path.open(
                "r",
                encoding=encoding,
                newline="",
            ) as csv_file:
                rows = list(
                    csv.reader(
                        csv_file,
                    ),
                )

            if not rows:
                raise ExpressCsvError(
                    "ไฟล์ CSV ไม่มีข้อมูล",
                )

            return rows, encoding
        except UnicodeDecodeError as error:
            decode_errors.append(
                f"{encoding}: {error}",
            )

    raise ExpressCsvError(
        "ไม่สามารถอ่านภาษาไทยจากไฟล์ CSV ได้ "
        + " | ".join(
            decode_errors,
        ),
    )


def _extract_invoices(
    rows: list[list[str]],
) -> list[ExpressInvoice]:
    invoices = []

    for row_index, row in enumerate(
        rows,
    ):
        if _cell(row, 1) != "เขตการขาย:":
            continue

        warehouse_label = _cell(
            row,
            2,
        )

        if not warehouse_label:
            continue

        warehouse, sequence = (
            _parse_warehouse_label(
                warehouse_label,
            )
        )

        iv_row_index = _find_iv_row(
            rows,
            row_index + 1,
            min(
                row_index + 7,
                len(rows),
            ),
        )

        if iv_row_index is None:
            continue

        iv_row = rows[
            iv_row_index
        ]

        invoice = ExpressInvoice(
            warehouse=warehouse,
            warehouse_label=(
                f"{warehouse} {sequence}"
            ),
            warehouse_sequence=(
                sequence
            ),
            iv_number=_cell(
                iv_row,
                6,
            ).upper(),
            document_date=_cell(
                iv_row,
                7,
            ),
            row_number=(
                iv_row_index + 1
            ),
        )

        item_row_index = (
            iv_row_index + 1
        )

        while item_row_index < len(
            rows,
        ):
            item_row = rows[
                item_row_index
            ]

            product_name = _cell(
                item_row,
                10,
            )

            quantity_text = _cell(
                item_row,
                11,
            )

            if not product_name:
                break

            quantity = _parse_quantity(
                quantity_text,
                item_row_index + 1,
            )

            invoice.items.append(
                ExpressItem(
                    product_code=_cell(
                        item_row,
                        9,
                    ),
                    product_name=(
                        product_name
                    ),
                    quantity=quantity,
                    row_number=(
                        item_row_index
                        + 1
                    ),
                ),
            )

            item_row_index += 1

        invoices.append(
            invoice,
        )

    return invoices


def _find_iv_row(
    rows: list[list[str]],
    start_index: int,
    end_index: int,
) -> int | None:
    for row_index in range(
        start_index,
        end_index,
    ):
        iv_number = _cell(
            rows[row_index],
            6,
        )

        if IV_PATTERN.fullmatch(
            iv_number,
        ):
            return row_index

    return None


def _iv_sort_key(
    invoice: ExpressInvoice,
) -> tuple[int, str]:
    digits = re.sub(
        r"\D+",
        "",
        invoice.iv_number,
    )

    if digits:
        return int(digits), invoice.iv_number

    return 0, invoice.iv_number


def _parse_warehouse_label(
    value: str,
) -> tuple[str, int]:
    compact_value = re.sub(
        r"\s+",
        " ",
        value,
    ).strip()

    match = (
        WAREHOUSE_SEQUENCE_PATTERN
        .fullmatch(
            compact_value,
        )
    )

    if not match:
        return compact_value, 1

    warehouse = match.group(
        1,
    ).strip()

    sequence = int(
        match.group(
            2,
        ),
    )

    return warehouse, sequence


def _parse_quantity(
    value: str,
    row_number: int,
) -> float:
    normalized = value
    normalized = normalized.replace(
        ",",
        "",
    )
    normalized = normalized.strip()

    try:
        return float(
            normalized,
        )
    except ValueError as error:
        raise ExpressCsvError(
            "จำนวนสินค้าไม่ถูกต้องที่ "
            f"L{row_number}: {value}",
        ) from error


def _build_warehouse_results(
    invoices: list[ExpressInvoice],
) -> list[dict]:
    grouped: OrderedDict[
        str,
        list[ExpressInvoice],
    ] = OrderedDict(
        (
            warehouse,
            [],
        )
        for warehouse in WAREHOUSE_ORDER
    )

    for invoice in invoices:
        grouped.setdefault(
            invoice.warehouse,
            [],
        ).append(
            invoice,
        )

    results = []

    for warehouse, records in grouped.items():
        product_keys = {
            _product_key(
                item,
            )
            for invoice in records
            for item in invoice.items
        }

        total_quantity = sum(
            item.quantity
            for invoice in records
            for item in invoice.items
        )

        results.append({
            "warehouse": warehouse,
            "iv_count": len(
                records,
            ),
            "iv_numbers": [
                invoice.iv_number
                for invoice in records
            ],
            "item_line_count": sum(
                len(invoice.items)
                for invoice in records
            ),
            "product_count": len(
                product_keys,
            ),
            "total_quantity": (
                _clean_number(
                    total_quantity,
                )
            ),
        })

    return results


def _build_product_results(
    invoices: list[ExpressInvoice],
) -> list[dict]:
    products: OrderedDict[
        str,
        dict,
    ] = OrderedDict()

    for invoice in invoices:
        for item in invoice.items:
            key = _product_key(
                item,
            )

            if key not in products:
                products[key] = {
                    "product_code": (
                        item.product_code
                    ),
                    "product_name": (
                        item.product_name
                    ),
                    "quantity": 0.0,
                    "warehouses": [],
                }

            product = products[
                key
            ]

            product["quantity"] += (
                item.quantity
            )

            if (
                invoice.warehouse
                not in
                product["warehouses"]
            ):
                product[
                    "warehouses"
                ].append(
                    invoice.warehouse,
                )

    return [
        {
            **product,
            "quantity": _clean_number(
                product["quantity"],
            ),
        }
        for product in products.values()
    ]


def _invoice_result(
    invoice: ExpressInvoice,
) -> dict:
    return {
        "warehouse": invoice.warehouse,
        "warehouse_label": (
            invoice.warehouse_label
        ),
        "warehouse_sequence": (
            invoice.warehouse_sequence
        ),
        "iv_number": invoice.iv_number,
        "document_date": (
            invoice.document_date
        ),
        "row_number": invoice.row_number,
        "item_line_count": len(
            invoice.items,
        ),
        "total_quantity": _clean_number(
            sum(
                item.quantity
                for item in invoice.items
            ),
        ),
        "items": [
            {
                "product_code": (
                    item.product_code
                ),
                "product_name": (
                    item.product_name
                ),
                "quantity": (
                    _clean_number(
                        item.quantity,
                    )
                ),
                "row_number": (
                    item.row_number
                ),
            }
            for item in invoice.items
        ],
    }


def _product_key(
    item: ExpressItem,
) -> str:
    if item.product_code:
        return (
            "code:"
            + item.product_code.strip()
        )

    return (
        "name:"
        + re.sub(
            r"\s+",
            "",
            item.product_name,
        ).casefold()
    )


def _cell(
    row: list[str],
    index: int,
) -> str:
    if index >= len(row):
        return ""

    return row[index].strip()


def _clean_number(
    value: float,
) -> int | float:
    if value.is_integer():
        return int(
            value,
        )

    return round(
        value,
        4,
    )
