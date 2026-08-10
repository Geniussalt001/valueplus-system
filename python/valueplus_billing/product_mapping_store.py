from __future__ import annotations

import re
import sqlite3

from datetime import datetime, timezone
from pathlib import Path


CPALL_CODE_PATTERN = re.compile(r"^\d{7}$")
EXPRESS_CODE_PATTERN = re.compile(r"^\d{2}-\d{4}-\d{2}$")


def initialize_mapping_store(
    database_path: str | Path,
) -> Path:
    path = Path(database_path).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS billing_product_mappings (
                cpall_code TEXT PRIMARY KEY,
                barcode TEXT NOT NULL DEFAULT '',
                pdf_name TEXT NOT NULL,
                express_code TEXT NOT NULL,
                keyword TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """,
        )

    return path


def load_product_mappings(
    database_path: str | Path,
) -> list[dict[str, str]]:
    path = initialize_mapping_store(database_path)

    with sqlite3.connect(path) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT
                cpall_code,
                barcode,
                pdf_name,
                express_code,
                keyword
            FROM billing_product_mappings
            ORDER BY cpall_code
            """,
        ).fetchall()

    return [dict(row) for row in rows]


def save_product_mapping(
    database_path: str | Path,
    cpall_code: str,
    barcode: str,
    pdf_name: str,
    express_code: str,
) -> dict[str, str]:
    code = str(cpall_code or "").strip()
    name = " ".join(str(pdf_name or "").split())
    barcode_value = str(barcode or "").strip()
    express = str(express_code or "").strip().upper()

    if not CPALL_CODE_PATTERN.fullmatch(code):
        raise ValueError("รหัส CPALL ต้องเป็นตัวเลข 7 หลัก")
    if not name:
        raise ValueError("ไม่พบชื่อสินค้าจาก PDF")
    if not EXPRESS_CODE_PATTERN.fullmatch(express):
        raise ValueError("รหัส Express ต้องอยู่ในรูปแบบ 01-0000-00")

    path = initialize_mapping_store(database_path)
    now = datetime.now(timezone.utc).isoformat()
    keyword = name

    with sqlite3.connect(path) as connection:
        connection.execute(
            """
            INSERT INTO billing_product_mappings (
                cpall_code,
                barcode,
                pdf_name,
                express_code,
                keyword,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(cpall_code)
            DO UPDATE SET
                barcode = excluded.barcode,
                pdf_name = excluded.pdf_name,
                express_code = excluded.express_code,
                keyword = excluded.keyword,
                updated_at = excluded.updated_at
            """,
            (
                code,
                barcode_value,
                name,
                express,
                keyword,
                now,
                now,
            ),
        )

    return {
        "cpall_code": code,
        "barcode": barcode_value,
        "pdf_name": name,
        "express_code": express,
        "keyword": keyword,
        "database_path": str(path),
    }
