from __future__ import annotations

import sys
from pathlib import Path


def data_file(file_name: str) -> Path:
    """Resolve editable source data and PyInstaller bundled data."""
    if getattr(sys, "frozen", False):
        root = Path(getattr(sys, "_MEIPASS"))
        return root / "valueplus_billing" / "data" / file_name

    return Path(__file__).resolve().parent / "data" / file_name


def warehouse_db_path() -> Path:
    return data_file("warehouses.json")


def product_db_path() -> Path:
    return data_file("products.json")
