from __future__ import annotations

import re
import unicodedata


ITEM_ROW_QUANTITY_PATTERN = re.compile(
    r"^(?P<prefix>\s*\d+\s+\d{13}\s+.+?\s+1\s+)"
    r"(?P<quantity>\d[\d,]*)"
    r"(?P<suffix>\s+0\s+\d[\d,]*(?:\.\d+)?)",
)
ITEM_ROW_DOTTED_QUANTITY_PATTERN = re.compile(
    r"^(?P<prefix>\s*\d+\s+\d{13}\s+.+?\s+1\s+)"
    r"(?P<quantity>\d[\d,]*)\."
    r"(?P<suffix>\s+0\s+\d[\d,]*(?:\.\d+)?)",
)

CID_PATTERN = re.compile(r"\(cid:(\d+)\)")

# Microsoft Reporting Services 11 exports the compact CP ALL PO layout
# without a ToUnicode table. pdfplumber recovers Thai base letters, but the
# positioned marks below are returned as CID placeholders.
CPALL_CID_REPLACEMENTS = {
    "1142": "็",
    "1143": "่",
    "1144": "้",
    "1147": "์",
    "1148": "ํ",
    "1173": "่",
    "1174": "้",
    "1177": "์",
}

# The compact layout does not print EAN-13 barcodes. Preserve the old parser
# behaviour for products already known to the system.
CPALL_CODE_BARCODES = {
    "6002424": "8859898700156",
    "6002425": "8859898700415",
    "6002487": "8859389704540",
    "6002510": "8859389704717",
    "6002567": "8859389704427",
    "6002580": "8859389704618",
    "6002601": "8859389704731",
    "6002613": "8859389704670",
    "6002634": "8859389704632",
    "6002690": "8859898700071",
    "6002691": "8859898700057",
    "6002742": "8859898700118",
    "6002769": "8859898700194",
    "6002777": "8859898700132",
    "6002781": "8859898700255",
    "6002797": "8859898700279",
    "6002798": "8859898700217",
    "6002799": "8859898700316",
}


def normalize_cpall_pdf_text(text: str) -> str:
    """Normalize extracted text from both CP ALL PDF layouts."""
    normalized = CID_PATTERN.sub(
        lambda match: CPALL_CID_REPLACEMENTS.get(
            match.group(1),
            match.group(0),
        ),
        str(text or ""),
    )
    normalized = normalized.replace("ํา", "ำ")
    # A few right-positioned Thai marks are sorted after the first Latin
    # letter in the adjacent UM brand suffix (for example ``มิลคU์ M``).
    normalized = re.sub(
        r"([ก-ฮ])U([ัิ-ฺ็-๎])\s*M",
        r"\1\2UM",
        normalized,
    )
    return unicodedata.normalize("NFC", normalized)


def normalize_cpall_document_date(value: str) -> str:
    """Return DD/MM/YYYY and expand a compact Buddhist year (69 -> 2569)."""
    match = re.fullmatch(
        r"\s*(\d{1,2})/(\d{1,2})/(\d{2}|\d{4})\s*",
        str(value or ""),
    )
    if match is None:
        return str(value or "").strip()

    day, month, year = (int(part) for part in match.groups())
    if year < 100:
        year += 2500

    return f"{day:02d}/{month:02d}/{year:04d}"


def normalize_wrapped_item_quantities(text: str) -> str:
    """Repair CP ALL quantities whose decimal part wraps to the next line.

    JasperReports can extract a visual ``5,390.00`` as either
    ``5,390.`` followed by ``00`` or ``10,060`` followed by ``.00``.
    Repair only lines shaped like product rows so unrelated totals are not
    modified.
    """
    lines = text.splitlines()

    for index in range(1, len(lines)):
        decimal_part = lines[index].strip()
        previous_line = lines[index - 1]

        if decimal_part == "00":
            pattern = ITEM_ROW_DOTTED_QUANTITY_PATTERN
            suffix = ".00"
            trailing_dot_length = 1
        elif decimal_part == ".00":
            pattern = ITEM_ROW_QUANTITY_PATTERN
            suffix = ".00"
            trailing_dot_length = 0
        else:
            continue

        match = pattern.search(previous_line)
        if match is None:
            continue

        lines[index - 1] = (
            previous_line[: match.start("quantity")]
            + match.group("quantity")
            + suffix
            + previous_line[
                match.end("quantity") + trailing_dot_length :
            ]
        )
        lines[index] = ""

    return "\n".join(lines)
