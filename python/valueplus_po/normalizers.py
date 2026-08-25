import re
import unicodedata

from .constants import (
    CHIANG_MAI_LAOS,
    WAREHOUSE_ALIASES,
)


# Microsoft Reporting Services sometimes exports Thai combining marks as
# literal CID placeholders. These values are stable in CP ALL ReportPO PDFs.
CPALL_CID_GLYPHS = {
    "1142": "็",
    "1143": "่",
    "1144": "้",
    "1147": "์",
    # SARA AM is exported as NIKHAHIT followed by the existing SARA AA.
    "1148": "ํ",
    "1173": "่",
    "1174": "้",
    "1177": "์",
}


def normalize_cpall_cid_text(
    raw_value: str,
) -> str:
    return re.sub(
        r"\(cid:(\d+)\)",
        lambda match: CPALL_CID_GLYPHS.get(
            match.group(1),
            "",
        ),
        str(raw_value or ""),
    )


def normalize_thai_text(
    raw_value: str,
) -> str:
    value = normalize_cpall_cid_text(
        raw_value,
    )

    value = unicodedata.normalize(
        "NFC",
        value,
    )

    # PDF บางไฟล์แยกสระอำเป็น "ํ" + "า"
    # เช่น "สําโรง" ให้เป็น "สำโรง"
    value = value.replace(
        "\u0e4d\u0e32",
        "\u0e33",
    )

    return value


def normalize_warehouse(
    raw_value: str,
) -> str:
    value = normalize_thai_text(
        raw_value,
    )

    value = re.sub(
        r"[_\s]+",
        " ",
        value,
    ).strip()

    # ตัดคำต่อท้ายชื่อคลัง
    value = re.sub(
        r"\s*คลังดี\s*$",
        "",
        value,
    ).strip()

    # ตัดคำนำหน้าชื่อคลัง
    value = re.sub(
        r"^(?:คลัง|ศูนย์กระจายสินค้า)"
        r"\s+BDC[.\s]*",
        "",
        value,
        flags=re.IGNORECASE,
    ).strip()

    value = re.sub(
        r"^BDC[.\s]*",
        "",
        value,
        flags=re.IGNORECASE,
    ).strip()

    upper_value = value.upper()

    # เชียงใหม่ (LAOS) คือเชียงใหม่ลำดับที่ 2
    if (
        "เชียงใหม่" in value
        and (
            "LAOS" in upper_value
            or "LAO" in upper_value
            or "ลาว" in value
        )
    ):
        return CHIANG_MAI_LAOS

    for (
        alias,
        canonical,
    ) in WAREHOUSE_ALIASES.items():
        normalized_alias = (
            normalize_thai_text(
                alias,
            )
        )

        if normalized_alias in value:
            return canonical

    return value


def normalize_product_name(
    raw_value: str,
) -> str:
    value = normalize_thai_text(
        raw_value,
    )

    value = value.upper().strip()

    # ReportPO can place a Thai mark between U and M, for example U์ M.
    # Move that mark back to the Thai word before removing the UM marker.
    value = re.sub(
        r"U([\u0e31-\u0e4e]*)\s*M",
        r"\1",
        value,
    )

    # ตัดตัว H หน้าชื่อสินค้าใน PDF
    value = re.sub(
        r"^H",
        "",
        value,
    )

    removable_words = (
        "UM",
        "ยูมิยูมิ",
        "ยูมียูมิ",
        "NEW",
        "ใหม่",
    )

    for word in removable_words:
        value = value.replace(
            word,
            "",
        )

    # ทำตัวสะกดให้ตรงกับ Template
    value = value.replace(
        "ชิฟฟ่อน",
        "ชิฟฟอน",
    )

    # PDF มีคำว่า "กลิ่น" แต่ Template ไม่มี
    value = value.replace(
        "กลิ่น",
        "",
    )

    # ตัดน้ำหนักก่อนเปรียบเทียบชื่อ
    value = re.sub(
        r"\d+(?:\.\d+)?"
        r"\s*(?:G\.?|GM\.?|GRAM|กรัม)",
        "",
        value,
        flags=re.IGNORECASE,
    )

    # เหลือเฉพาะภาษาไทย อังกฤษ และตัวเลข
    value = re.sub(
        r"[^ก-๙A-Z0-9]",
        "",
        value,
    )

    return value
