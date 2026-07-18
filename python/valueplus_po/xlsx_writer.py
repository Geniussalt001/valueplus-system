import os
import re
import tempfile
import zipfile

from datetime import date
from pathlib import Path
from xml.etree import ElementTree


MAIN_NS = (
    "http://schemas.openxmlformats.org/"
    "spreadsheetml/2006/main"
)

OFFICE_REL_NS = (
    "http://schemas.openxmlformats.org/"
    "officeDocument/2006/relationships"
)

PACKAGE_REL_NS = (
    "http://schemas.openxmlformats.org/"
    "package/2006/relationships"
)


class XlsxWriteError(ValueError):
    pass


def thai_date_to_excel_serial(
    value: str,
) -> int:
    try:
        day, month, year = [
            int(part)
            for part in value.split("/")
        ]

        if year >= 2400:
            year -= 543

        parsed = date(
            year,
            month,
            day,
        )

    except (
        TypeError,
        ValueError,
    ) as error:
        raise XlsxWriteError(
            f"วันที่ไม่ถูกต้อง: {value}",
        ) from error

    return (
        parsed
        - date(1899, 12, 30)
    ).days


def write_workbook(
    template_path:
        str | Path,

    output_path:
        str | Path,

    sheet_updates:
        dict[
            str,
            dict[
                str,
                str
                | int
                | float
                | None,
            ],
        ],
) -> None:
    source = Path(
        template_path,
    )

    destination = Path(
        output_path,
    )

    if not source.is_file():
        raise XlsxWriteError(
            f"ไม่พบไฟล์ Template: {source}",
        )

    destination.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    file_descriptor, temporary_name = (
        tempfile.mkstemp(
            suffix=".xlsx",
            dir=destination.parent,
        )
    )

    os.close(
        file_descriptor,
    )

    temporary_path = Path(
        temporary_name,
    )

    try:
        with zipfile.ZipFile(
            source,
            "r",
        ) as source_zip:
            sheet_parts = (
                _resolve_sheet_parts(
                    source_zip,
                )
            )

            unknown_sheets = sorted(
                set(sheet_updates)
                - set(sheet_parts)
            )

            if unknown_sheets:
                raise XlsxWriteError(
                    "ไม่พบชีตใน Template: "
                    + ", ".join(
                        unknown_sheets,
                    ),
                )

            patches_by_part = {
                sheet_parts[
                    sheet_name
                ]: updates

                for (
                    sheet_name,
                    updates,
                ) in (
                    sheet_updates.items()
                )
            }

            with zipfile.ZipFile(
                temporary_path,
                "w",
            ) as output_zip:
                for zip_info in (
                    source_zip.infolist()
                ):
                    part_name = (
                        zip_info.filename
                    )

                    # ไม่คัดลอก calcChain เก่า
                    if (
                        part_name
                        == "xl/calcChain.xml"
                    ):
                        continue

                    data = source_zip.read(
                        part_name,
                    )

                    if (
                        part_name
                        in patches_by_part
                    ):
                        xml_text = (
                            data.decode(
                                "utf-8",
                            )
                        )

                        for (
                            cell_ref,
                            value,
                        ) in (
                            patches_by_part[
                                part_name
                            ].items()
                        ):
                            xml_text = (
                                _replace_existing_cell(
                                    xml_text,
                                    cell_ref,
                                    value,
                                )
                            )

                        data = xml_text.encode(
                            "utf-8",
                        )

                    elif (
                        part_name
                        == "xl/workbook.xml"
                    ):
                        data = (
                            _force_recalculation(
                                data.decode(
                                    "utf-8",
                                ),
                            )
                            .encode(
                                "utf-8",
                            )
                        )

                    elif (
                        part_name
                        == (
                            "xl/_rels/"
                            "workbook.xml.rels"
                        )
                    ):
                        data = (
                            _remove_calc_chain_relationship(
                                data.decode(
                                    "utf-8",
                                ),
                            )
                            .encode(
                                "utf-8",
                            )
                        )

                    elif (
                        part_name
                        == "[Content_Types].xml"
                    ):
                        data = (
                            _remove_calc_chain_content_type(
                                data.decode(
                                    "utf-8",
                                ),
                            )
                            .encode(
                                "utf-8",
                            )
                        )

                    output_zip.writestr(
                        zip_info,
                        data,
                    )

        _validate_created_workbook(
            temporary_path,
        )

        os.replace(
            temporary_path,
            destination,
        )

    except PermissionError as error:
        temporary_path.unlink(
            missing_ok=True,
        )

        raise XlsxWriteError(
            "ไม่สามารถบันทึกไฟล์ Excel ได้ "
            "กรุณาปิดไฟล์เดิมใน Excel แล้วลองใหม่",
        ) from error

    except Exception:
        temporary_path.unlink(
            missing_ok=True,
        )

        raise


def _resolve_sheet_parts(
    source_zip:
        zipfile.ZipFile,
) -> dict[str, str]:
    workbook_root = (
        ElementTree.fromstring(
            source_zip.read(
                "xl/workbook.xml",
            ),
        )
    )

    rels_root = (
        ElementTree.fromstring(
            source_zip.read(
                "xl/_rels/"
                "workbook.xml.rels",
            ),
        )
    )

    relation_targets = {
        relation.attrib["Id"]:
            relation.attrib["Target"]

        for relation in (
            rels_root.findall(
                f"{{{PACKAGE_REL_NS}}}"
                "Relationship",
            )
        )
    }

    result: dict[
        str,
        str,
    ] = {}

    for sheet in (
        workbook_root.findall(
            f".//{{{MAIN_NS}}}sheet",
        )
    ):
        relation_id = (
            sheet.attrib[
                f"{{{OFFICE_REL_NS}}}id"
            ]
        )

        target = (
            relation_targets[
                relation_id
            ]
            .replace(
                "\\",
                "/",
            )
        )

        if target.startswith("/"):
            target = target.lstrip(
                "/",
            )

        elif not target.startswith(
            "xl/",
        ):
            target = f"xl/{target}"

        result[
            sheet.attrib["name"]
        ] = target

    return result


def _replace_existing_cell(
    xml_text: str,

    cell_ref: str,

    value:
        str
        | int
        | float
        | None,
) -> str:
    escaped_ref = re.escape(
        cell_ref.upper(),
    )

    # ต้องตรวจ Self-closing cell ก่อน
    # เพื่อไม่ให้ regex กินเซลล์ถัดไป
    pattern = re.compile(
        (
            rf'<c'
            rf'(?P<selfattrs>'
            rf'[^>]*\br="{escaped_ref}"'
            rf'[^>]*)\s*/>'
        )
        + (
            rf'|<c'
            rf'(?P<attrs>'
            rf'[^>]*\br="{escaped_ref}"'
            rf'[^>]*)>'
            rf'(?P<body>.*?)'
            rf'</c>'
        ),
        re.DOTALL,
    )

    match = pattern.search(
        xml_text,
    )

    if not match:
        raise XlsxWriteError(
            f"ไม่พบเซลล์ {cell_ref} "
            "ในโครงสร้าง Template",
        )

    attrs = (
        match.group(
            "selfattrs",
        )
        or match.group(
            "attrs",
        )
        or ""
    )

    attrs = re.sub(
        r'\s+t="[^"]*"',
        "",
        attrs,
    )

    attrs = attrs.rstrip(
        " /\t\r\n",
    )

    if value is None:
        replacement = (
            f"<c{attrs}/>"
        )

    elif isinstance(
        value,
        str,
    ):
        escaped_value = (
            value
            .replace(
                "&",
                "&amp;",
            )
            .replace(
                "<",
                "&lt;",
            )
            .replace(
                ">",
                "&gt;",
            )
            .replace(
                '"',
                "&quot;",
            )
        )

        replacement = (
            f'<c{attrs} '
            f't="inlineStr">'
            f"<is>"
            f'<t xml:space="preserve">'
            f"{escaped_value}"
            f"</t>"
            f"</is>"
            f"</c>"
        )

    else:
        if (
            isinstance(
                value,
                float,
            )
            and value.is_integer()
        ):
            number_text = str(
                int(value),
            )
        else:
            number_text = str(
                value,
            )

        replacement = (
            f'<c{attrs} t="n">'
            f"<v>{number_text}</v>"
            f"</c>"
        )

    return (
        xml_text[
            :match.start()
        ]
        + replacement
        + xml_text[
            match.end():
        ]
    )


def _force_recalculation(
    xml_text: str,
) -> str:
    pattern = re.compile(
        r"<calcPr\b"
        r"(?P<attrs>[^>]*)"
        r"\s*/>",
    )

    match = pattern.search(
        xml_text,
    )

    if match:
        attrs = (
            match.group(
                "attrs",
            )
            .rstrip(
                " /\t\r\n",
            )
        )

        attrs = re.sub(
            (
                r"\s+"
                r"(?:"
                r"calcMode|"
                r"fullCalcOnLoad|"
                r"forceFullCalc|"
                r"calcCompleted"
                r')="[^"]*"'
            ),
            "",
            attrs,
        )

        replacement = (
            f"<calcPr{attrs} "
            f'calcMode="auto" '
            f'fullCalcOnLoad="1" '
            f'forceFullCalc="1" '
            f'calcCompleted="0"/>'
        )

        return (
            xml_text[
                :match.start()
            ]
            + replacement
            + xml_text[
                match.end():
            ]
        )

    return xml_text.replace(
        "</workbook>",
        (
            '<calcPr calcMode="auto" '
            'fullCalcOnLoad="1" '
            'forceFullCalc="1" '
            'calcCompleted="0"/>'
            "</workbook>"
        ),
        1,
    )


def _remove_calc_chain_relationship(
    xml_text: str,
) -> str:
    pattern = re.compile(
        (
            r"<Relationship\b"
            r"(?=[^>]*"
            r"(?:"
            r'Type="[^"]*/calcChain"'
            r"|"
            r'Target="[^"]*calcChain\.xml"'
            r")"
            r")"
            r"[^>]*/>"
        ),
        re.IGNORECASE,
    )

    return pattern.sub(
        "",
        xml_text,
    )


def _remove_calc_chain_content_type(
    xml_text: str,
) -> str:
    pattern = re.compile(
        (
            r"<Override\b"
            r"(?=[^>]*"
            r'PartName="/xl/'
            r'calcChain\.xml"'
            r")"
            r"[^>]*/>"
        ),
        re.IGNORECASE,
    )

    return pattern.sub(
        "",
        xml_text,
    )


def _validate_created_workbook(
    workbook_path: Path,
) -> None:
    try:
        with zipfile.ZipFile(
            workbook_path,
            "r",
        ) as workbook_zip:
            broken_part = (
                workbook_zip.testzip()
            )

            if broken_part:
                raise XlsxWriteError(
                    "ไฟล์ Excel เสียหายบริเวณ: "
                    f"{broken_part}",
                )

            names = set(
                workbook_zip.namelist(),
            )

            required_parts = {
                "[Content_Types].xml",
                "xl/workbook.xml",
                (
                    "xl/_rels/"
                    "workbook.xml.rels"
                ),
            }

            missing_parts = (
                required_parts
                - names
            )

            if missing_parts:
                raise XlsxWriteError(
                    "ไฟล์ Excel "
                    "ขาดโครงสร้างสำคัญ: "
                    + ", ".join(
                        sorted(
                            missing_parts,
                        ),
                    ),
                )

            if (
                "xl/calcChain.xml"
                in names
            ):
                raise XlsxWriteError(
                    "ยังพบ calcChain เก่า"
                    "ในไฟล์ผลลัพธ์",
                )

            for part_name in names:
                if (
                    part_name.endswith(
                        ".xml",
                    )
                    or part_name.endswith(
                        ".rels",
                    )
                ):
                    ElementTree.fromstring(
                        workbook_zip.read(
                            part_name,
                        ),
                    )

    except zipfile.BadZipFile as error:
        raise XlsxWriteError(
            "สร้างไฟล์ Excel ไม่สมบูรณ์",
        ) from error