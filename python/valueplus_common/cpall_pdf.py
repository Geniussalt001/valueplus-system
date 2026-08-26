from __future__ import annotations

import re


ITEM_ROW_QUANTITY_PATTERN = re.compile(
    r"^(?P<prefix>\s*\d+\s+\d{7}(?:\d{6})?\s+.+?\s+1\s+)"
    r"(?P<quantity>\d[\d,]*)"
    r"(?P<suffix>\s+0\s+\d[\d,]*(?:\.\d+)?)",
)
ITEM_ROW_DOTTED_QUANTITY_PATTERN = re.compile(
    r"^(?P<prefix>\s*\d+\s+\d{7}(?:\d{6})?\s+.+?\s+1\s+)"
    r"(?P<quantity>\d[\d,]*)\."
    r"(?P<suffix>\s+0\s+\d[\d,]*(?:\.\d+)?)",
)

CID_THAI_REPLACEMENTS = {
    "1142": "็",
    "1143": "่",
    "1144": "้",
    "1147": "์",
    "1148": "ำ",
    "1173": "่",
    "1174": "้",
    "1177": "์",
}
CID_PATTERN = re.compile(
    r"\(cid:(\d+)\)",
)


def repair_cpall_extracted_text(text: str) -> str:
    """Repair Thai marks emitted as CID placeholders by CP ALL PDFs."""
    repaired = CID_PATTERN.sub(
        lambda match: CID_THAI_REPLACEMENTS.get(
            match.group(1),
            "",
        ),
        str(text or ""),
    )

    repaired = repaired.replace(
        "ำา",
        "ำ",
    )

    return re.sub(
        r"U([\u0e31-\u0e4e]+)\s*M",
        r"\1UM",
        repaired,
    )


def normalize_cpall_document_date(value: str) -> str:
    """Expand a two-digit Buddhist year such as 69 to 2569."""
    day_text, month_text, year_text = str(value or "").split("/")
    year = int(year_text)

    if len(year_text) == 2:
        year += 2500

    return f"{int(day_text):02d}/{int(month_text):02d}/{year:04d}"


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
