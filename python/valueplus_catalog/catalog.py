import csv
import hashlib
import re
import sqlite3

from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path


PRODUCT_CODE_PATTERN = re.compile(
    r"^\d{2}-\d{4}-\d{2}$",
)

IV_PATTERN = re.compile(
    r"^IVVPR\d+$",
    re.IGNORECASE,
)

CSV_ENCODINGS = (
    "utf-8-sig",
    "cp874",
)


class CatalogError(ValueError):
    pass


def initialize_database(
    database_path: str | Path,
) -> Path:
    path = Path(database_path).resolve()
    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with _connect(path) as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS products (
                product_code TEXT PRIMARY KEY,
                source_name TEXT NOT NULL,
                display_name TEXT NOT NULL,
                line_name TEXT NOT NULL DEFAULT '',
                display_order INTEGER NOT NULL DEFAULT 0,
                active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
                first_seen_date TEXT NOT NULL DEFAULT '',
                last_seen_date TEXT NOT NULL DEFAULT '',
                last_source_path TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS product_aliases (
                alias_id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_code TEXT NOT NULL,
                alias_name TEXT NOT NULL,
                normalized_alias TEXT NOT NULL,
                source_type TEXT NOT NULL DEFAULT 'express_csv',
                first_seen_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL,
                UNIQUE (product_code, normalized_alias),
                FOREIGN KEY (product_code)
                    REFERENCES products(product_code)
                    ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS product_prices (
                price_id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_code TEXT NOT NULL,
                unit_price REAL NOT NULL,
                effective_date TEXT NOT NULL DEFAULT '',
                source_path TEXT NOT NULL DEFAULT '',
                first_seen_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL,
                UNIQUE (product_code, unit_price, effective_date),
                FOREIGN KEY (product_code)
                    REFERENCES products(product_code)
                    ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS promotions (
                promotion_id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_code TEXT NOT NULL,
                promotion_type TEXT NOT NULL DEFAULT 'normal',
                quantity_multiplier REAL NOT NULL DEFAULT 1,
                start_date TEXT NOT NULL DEFAULT '',
                end_date TEXT NOT NULL DEFAULT '',
                active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
                note TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (product_code)
                    REFERENCES products(product_code)
                    ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS catalog_import_runs (
                run_id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_path TEXT NOT NULL,
                source_hash TEXT NOT NULL,
                source_encoding TEXT NOT NULL,
                document_date TEXT NOT NULL DEFAULT '',
                discovered_products INTEGER NOT NULL DEFAULT 0,
                new_products INTEGER NOT NULL DEFAULT 0,
                updated_products INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL,
                message TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                UNIQUE (source_hash, status)
            );

            CREATE INDEX IF NOT EXISTS idx_products_active_order
                ON products(active, display_order, product_code);

            CREATE INDEX IF NOT EXISTS idx_aliases_normalized
                ON product_aliases(normalized_alias);

            CREATE INDEX IF NOT EXISTS idx_promotions_product_dates
                ON promotions(product_code, start_date, end_date, active);
            """,
        )

    return path


def import_express_csv(
    database_path: str | Path,
    csv_path: str | Path,
) -> dict:
    database = initialize_database(
        database_path,
    )
    source = Path(csv_path).resolve()

    if not source.is_file():
        raise CatalogError(
            f"ไม่พบไฟล์ CSV: {source}",
        )

    source_hash = _sha256(source)
    rows, encoding = _read_csv(source)
    parsed = _extract_products(rows)
    now = _utc_now()

    with _connect(database) as connection:
        previous = connection.execute(
            """
            SELECT run_id
            FROM catalog_import_runs
            WHERE source_hash = ? AND status = 'success'
            LIMIT 1
            """,
            (source_hash,),
        ).fetchone()

        if previous is not None:
            return {
                "status": "already_imported",
                "database_path": str(database),
                "source_path": str(source),
                "source_hash": source_hash,
                "encoding": encoding,
                "document_date": parsed["document_date"],
                "discovered_products": len(parsed["products"]),
                "new_products": 0,
                "updated_products": 0,
                "products": list_products(database),
            }

        next_order = connection.execute(
            "SELECT COALESCE(MAX(display_order), 0) FROM products",
        ).fetchone()[0]

        new_products = 0
        updated_products = 0

        for product in parsed["products"]:
            existing = connection.execute(
                """
                SELECT source_name, last_seen_date
                FROM products
                WHERE product_code = ?
                """,
                (product["product_code"],),
            ).fetchone()

            if existing is None:
                next_order += 1
                connection.execute(
                    """
                    INSERT INTO products (
                        product_code,
                        source_name,
                        display_name,
                        line_name,
                        display_order,
                        active,
                        first_seen_date,
                        last_seen_date,
                        last_source_path,
                        created_at,
                        updated_at
                    ) VALUES (?, ?, ?, '', ?, 1, ?, ?, ?, ?, ?)
                    """,
                    (
                        product["product_code"],
                        product["product_name"],
                        product["product_name"],
                        next_order,
                        parsed["document_date"],
                        parsed["document_date"],
                        str(source),
                        now,
                        now,
                    ),
                )
                new_products += 1
            else:
                changed = (
                    existing["source_name"] != product["product_name"]
                    or existing["last_seen_date"] != parsed["document_date"]
                )

                connection.execute(
                    """
                    UPDATE products
                    SET source_name = ?,
                        last_seen_date = ?,
                        last_source_path = ?,
                        updated_at = ?
                    WHERE product_code = ?
                    """,
                    (
                        product["product_name"],
                        parsed["document_date"],
                        str(source),
                        now,
                        product["product_code"],
                    ),
                )

                if changed:
                    updated_products += 1

            normalized_alias = _normalize_name(
                product["product_name"],
            )
            connection.execute(
                """
                INSERT INTO product_aliases (
                    product_code,
                    alias_name,
                    normalized_alias,
                    source_type,
                    first_seen_at,
                    last_seen_at
                ) VALUES (?, ?, ?, 'express_csv', ?, ?)
                ON CONFLICT(product_code, normalized_alias)
                DO UPDATE SET
                    alias_name = excluded.alias_name,
                    last_seen_at = excluded.last_seen_at
                """,
                (
                    product["product_code"],
                    product["product_name"],
                    normalized_alias,
                    now,
                    now,
                ),
            )

            for price in product["prices"]:
                connection.execute(
                    """
                    INSERT INTO product_prices (
                        product_code,
                        unit_price,
                        effective_date,
                        source_path,
                        first_seen_at,
                        last_seen_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(product_code, unit_price, effective_date)
                    DO UPDATE SET
                        source_path = excluded.source_path,
                        last_seen_at = excluded.last_seen_at
                    """,
                    (
                        product["product_code"],
                        price,
                        parsed["document_date"],
                        str(source),
                        now,
                        now,
                    ),
                )

        connection.execute(
            """
            INSERT INTO catalog_import_runs (
                source_path,
                source_hash,
                source_encoding,
                document_date,
                discovered_products,
                new_products,
                updated_products,
                status,
                message,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'success', '', ?)
            """,
            (
                str(source),
                source_hash,
                encoding,
                parsed["document_date"],
                len(parsed["products"]),
                new_products,
                updated_products,
                now,
            ),
        )

    return {
        "status": "success",
        "database_path": str(database),
        "source_path": str(source),
        "source_hash": source_hash,
        "encoding": encoding,
        "document_date": parsed["document_date"],
        "invoice_count": parsed["invoice_count"],
        "discovered_products": len(parsed["products"]),
        "new_products": new_products,
        "updated_products": updated_products,
        "products": list_products(database),
    }


def list_products(
    database_path: str | Path,
    include_inactive: bool = True,
) -> list[dict]:
    database = initialize_database(
        database_path,
    )
    where_clause = "" if include_inactive else "WHERE active = 1"

    with _connect(database) as connection:
        rows = connection.execute(
            f"""
            SELECT
                product_code,
                source_name,
                display_name,
                line_name,
                display_order,
                active,
                first_seen_date,
                last_seen_date,
                last_source_path,
                created_at,
                updated_at
            FROM products
            {where_clause}
            ORDER BY display_order, product_code
            """,
        ).fetchall()

    return [
        {
            **dict(row),
            "active": bool(row["active"]),
        }
        for row in rows
    ]


def create_product(
    database_path: str | Path,
    product_code: str,
    display_name: str,
    line_name: str = "",
    display_order: int | None = None,
    active: bool = True,
) -> dict:
    database = initialize_database(database_path)
    code = product_code.strip()
    name = display_name.strip()

    if not PRODUCT_CODE_PATTERN.fullmatch(code):
        raise CatalogError(
            "รหัสสินค้าต้องอยู่ในรูปแบบ 01-0000-00",
        )

    if not name:
        raise CatalogError(
            "กรุณาระบุชื่อสินค้า",
        )

    now = _utc_now()

    with _connect(database) as connection:
        existing = connection.execute(
            "SELECT 1 FROM products WHERE product_code = ?",
            (code,),
        ).fetchone()

        if existing is not None:
            raise CatalogError(
                f"มีรหัสสินค้า {code} อยู่ในระบบแล้ว",
            )

        order = (
            max(0, int(display_order))
            if display_order is not None
            else connection.execute(
                "SELECT COALESCE(MAX(display_order), 0) + 1 FROM products",
            ).fetchone()[0]
        )

        connection.execute(
            """
            INSERT INTO products (
                product_code,
                source_name,
                display_name,
                line_name,
                display_order,
                active,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                code,
                name,
                name,
                line_name.strip(),
                order,
                1 if active else 0,
                now,
                now,
            ),
        )

    return _get_product(database, code)


def delete_product(
    database_path: str | Path,
    product_code: str,
) -> dict:
    database = initialize_database(database_path)
    code = product_code.strip()
    product = _get_product(database, code)

    with _connect(database) as connection:
        connection.execute(
            "DELETE FROM products WHERE product_code = ?",
            (code,),
        )

    return {
        "deleted": True,
        "product": product,
    }


def set_product_active(
    database_path: str | Path,
    product_code: str,
    active: bool,
) -> dict:
    database = initialize_database(database_path)
    now = _utc_now()

    with _connect(database) as connection:
        cursor = connection.execute(
            """
            UPDATE products
            SET active = ?, updated_at = ?
            WHERE product_code = ?
            """,
            (1 if active else 0, now, product_code),
        )

        if cursor.rowcount == 0:
            raise CatalogError(
                f"ไม่พบรหัสสินค้า: {product_code}",
            )

    return _get_product(database, product_code)


def update_product(
    database_path: str | Path,
    product_code: str,
    display_name: str | None = None,
    line_name: str | None = None,
    display_order: int | None = None,
) -> dict:
    database = initialize_database(database_path)
    current = _get_product(database, product_code)

    next_display_name = (
        display_name.strip()
        if display_name is not None
        else current["display_name"]
    )
    next_line_name = (
        line_name.strip()
        if line_name is not None
        else current["line_name"]
    )
    next_order = (
        max(0, int(display_order))
        if display_order is not None
        else current["display_order"]
    )

    if not next_display_name:
        raise CatalogError(
            "ชื่อแสดงผลห้ามเป็นค่าว่าง",
        )

    with _connect(database) as connection:
        connection.execute(
            """
            UPDATE products
            SET display_name = ?,
                line_name = ?,
                display_order = ?,
                updated_at = ?
            WHERE product_code = ?
            """,
            (
                next_display_name,
                next_line_name,
                next_order,
                _utc_now(),
                product_code,
            ),
        )

    return _get_product(database, product_code)


def _extract_products(
    rows: list[list[str]],
) -> dict:
    products: OrderedDict[str, dict] = OrderedDict()
    invoice_dates = []
    invoice_count = 0

    for row_number, row in enumerate(rows, start=1):
        iv_number = _cell(row, 6)
        if IV_PATTERN.fullmatch(iv_number):
            invoice_count += 1
            document_date = _cell(row, 7)
            if document_date and document_date not in invoice_dates:
                invoice_dates.append(document_date)

        sequence = _cell(row, 8)
        product_code = _cell(row, 9)
        product_name = _cell(row, 10)

        if (
            not sequence.isdigit()
            or not PRODUCT_CODE_PATTERN.fullmatch(product_code)
            or not product_name
        ):
            continue

        product = products.setdefault(
            product_code,
            {
                "product_code": product_code,
                "product_name": product_name,
                "prices": set(),
                "occurrence_count": 0,
                "first_row": row_number,
            },
        )
        product["product_name"] = product_name
        product["occurrence_count"] += 1

        price_text = _cell(row, 13).replace(",", "")
        try:
            price = float(price_text)
        except ValueError:
            price = 0

        if price > 0:
            product["prices"].add(price)

    if not products:
        raise CatalogError(
            "ไม่พบรายการสินค้าในไฟล์ Express CSV",
        )

    if len(invoice_dates) > 1:
        raise CatalogError(
            "พบวันที่เอกสารมากกว่า 1 วันในไฟล์ CSV",
        )

    product_results = []
    for product in products.values():
        product_results.append(
            {
                **product,
                "prices": sorted(product["prices"]),
            },
        )

    return {
        "document_date": invoice_dates[0] if invoice_dates else "",
        "invoice_count": invoice_count,
        "products": product_results,
    }


def _read_csv(
    source_path: Path,
) -> tuple[list[list[str]], str]:
    errors = []

    for encoding in CSV_ENCODINGS:
        try:
            with source_path.open(
                "r",
                encoding=encoding,
                newline="",
            ) as csv_file:
                rows = list(csv.reader(csv_file))

            return rows, encoding
        except UnicodeDecodeError as error:
            errors.append(f"{encoding}: {error}")

    raise CatalogError(
        "ไม่สามารถอ่านภาษาไทยจากไฟล์ CSV ได้ "
        + " | ".join(errors),
    )


def _get_product(
    database_path: Path,
    product_code: str,
) -> dict:
    with _connect(database_path) as connection:
        row = connection.execute(
            """
            SELECT *
            FROM products
            WHERE product_code = ?
            """,
            (product_code,),
        ).fetchone()

    if row is None:
        raise CatalogError(
            f"ไม่พบรหัสสินค้า: {product_code}",
        )

    result = dict(row)
    result["active"] = bool(result["active"])
    return result


def _connect(
    database_path: Path,
) -> sqlite3.Connection:
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA busy_timeout = 5000")
    return connection


def _cell(
    row: list[str],
    index: int,
) -> str:
    if index >= len(row):
        return ""
    return str(row[index]).strip()


def _normalize_name(value: str) -> str:
    return re.sub(
        r"[^0-9a-zก-๙]+",
        "",
        value.casefold(),
    )


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source_file:
        for chunk in iter(
            lambda: source_file.read(1024 * 1024),
            b"",
        ):
            digest.update(chunk)
    return digest.hexdigest()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(
        timespec="seconds",
    )
