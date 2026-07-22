import argparse
import json
import sqlite3
import sys
from datetime import datetime
from pathlib import Path


def connect_database(database_path: str) -> sqlite3.Connection:
    path = Path(database_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS doll_summary_drafts (
            summary_date TEXT PRIMARY KEY,
            quantities_json TEXT NOT NULL,
            total_quantity INTEGER NOT NULL DEFAULT 0,
            warehouse_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    connection.commit()
    return connection


def validate_date(value: str) -> str:
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError as error:
        raise ValueError(f"วันที่สรุปยอดไม่ถูกต้อง: {value}") from error
    return value


def normalize_quantities(raw_value: str) -> dict:
    try:
        source = json.loads(raw_value or "{}")
    except json.JSONDecodeError as error:
        raise ValueError("อ่านข้อมูลยอดตุ๊กตาไม่สำเร็จ") from error

    if not isinstance(source, dict):
        raise ValueError("ข้อมูลยอดตุ๊กตาต้องเป็น Object")

    normalized: dict[str, dict[str, str]] = {}
    for warehouse, products in source.items():
        if not isinstance(products, dict):
            continue

        clean_products: dict[str, str] = {}
        for product_code, quantity in products.items():
            text = str(quantity).strip()
            if not text:
                continue
            try:
                number = max(0, int(text))
            except ValueError:
                continue
            if number > 0:
                clean_products[str(product_code)] = str(number)

        if clean_products:
            normalized[str(warehouse)] = clean_products

    return normalized


def calculate_summary(quantities: dict) -> tuple[int, int]:
    total = 0
    warehouse_count = 0

    for products in quantities.values():
        warehouse_total = sum(int(value) for value in products.values())
        if warehouse_total > 0:
            warehouse_count += 1
            total += warehouse_total

    return total, warehouse_count


def row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "summary_date": row["summary_date"],
        "quantities": json.loads(row["quantities_json"]),
        "total_quantity": row["total_quantity"],
        "warehouse_count": row["warehouse_count"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def list_drafts(connection: sqlite3.Connection) -> dict:
    rows = connection.execute(
        """
        SELECT * FROM doll_summary_drafts
        ORDER BY summary_date DESC
        """
    ).fetchall()
    return {"drafts": [row_to_dict(row) for row in rows]}


def load_draft(connection: sqlite3.Connection, summary_date: str) -> dict:
    row = connection.execute(
        "SELECT * FROM doll_summary_drafts WHERE summary_date = ?",
        (validate_date(summary_date),),
    ).fetchone()
    if row is None:
        raise ValueError(f"ไม่พบงานสรุปยอดตุ๊กตาวันที่ {summary_date}")
    return row_to_dict(row)


def save_draft(
    connection: sqlite3.Connection,
    summary_date: str,
    quantities_json: str,
) -> dict:
    summary_date = validate_date(summary_date)
    quantities = normalize_quantities(quantities_json)
    total, warehouse_count = calculate_summary(quantities)
    now = datetime.now().isoformat(timespec="seconds")

    connection.execute(
        """
        INSERT INTO doll_summary_drafts (
            summary_date,
            quantities_json,
            total_quantity,
            warehouse_count,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(summary_date) DO UPDATE SET
            quantities_json = excluded.quantities_json,
            total_quantity = excluded.total_quantity,
            warehouse_count = excluded.warehouse_count,
            updated_at = excluded.updated_at
        """,
        (
            summary_date,
            json.dumps(quantities, ensure_ascii=False),
            total,
            warehouse_count,
            now,
            now,
        ),
    )
    connection.commit()
    return load_draft(connection, summary_date)


def delete_draft(connection: sqlite3.Connection, summary_date: str) -> dict:
    summary_date = validate_date(summary_date)
    cursor = connection.execute(
        "DELETE FROM doll_summary_drafts WHERE summary_date = ?",
        (summary_date,),
    )
    connection.commit()
    return {
        "deleted": cursor.rowcount > 0,
        "summary_date": summary_date,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", required=True)
    parser.add_argument("action", choices=["list", "load", "save", "delete"])
    parser.add_argument("--date", default="")
    parser.add_argument("--quantities-json", default="{}")
    arguments = parser.parse_args()

    try:
        with connect_database(arguments.database) as connection:
            if arguments.action == "list":
                data = list_drafts(connection)
            elif arguments.action == "load":
                data = load_draft(connection, arguments.date)
            elif arguments.action == "save":
                data = save_draft(
                    connection,
                    arguments.date,
                    arguments.quantities_json,
                )
            else:
                data = delete_draft(connection, arguments.date)

        print(json.dumps({"success": True, "data": data}, ensure_ascii=False))
        return 0
    except Exception as error:
        print(
            json.dumps({"success": False, "message": str(error)}, ensure_ascii=False),
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
