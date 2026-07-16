import re

from .constants import WAREHOUSE_ALIASES


def normalize_warehouse(raw_value: str) -> str:
    value = re.sub(r"[_\s]+", " ", raw_value or "").strip()
    value = re.sub(r"\s*คลังดี\s*$", "", value).strip()
    value = re.sub(r"^(?:คลัง|ศูนย์กระจายสินค้า)\s+BDC\s*", "", value).strip()
    value = re.sub(r"^BDC[.\s]*", "", value).strip()

    for alias, canonical in WAREHOUSE_ALIASES.items():
        if alias in value:
            return canonical

    return value


def normalize_product_name(raw_value: str) -> str:
    value = (raw_value or "").upper().strip()
    value = re.sub(r"^H", "", value)
    value = value.replace("UM", "")
    value = value.replace("ยูมิยูมิ", "")
    value = value.replace("NEW", "")
    value = value.replace("ใหม่", "")
    value = value.replace("ชิฟฟ่อน", "ชิฟฟอน")
    value = value.replace("กลิ่น", "")
    value = re.sub(r"\d+(?:\.\d+)?\s*(?:G\.?|กรัม)", "", value)
    value = re.sub(r"[^ก-๙A-Z0-9]", "", value)
    return value

