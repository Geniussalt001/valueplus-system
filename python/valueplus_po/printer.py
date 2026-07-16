import shutil
import tempfile
import time
import uuid

from pathlib import Path


class WorkbookPrintError(
    ValueError,
):
    pass


def open_print_dialog(
    workbook_path:
        str | Path,

    warehouses:
        list[dict],
) -> dict:
    source_path = Path(
        workbook_path,
    )

    if not source_path.is_file():
        raise WorkbookPrintError(
            f"ไม่พบไฟล์ Excel: {source_path}",
        )

    print_jobs = (
        validate_print_jobs(
            warehouses,
        )
    )

    if not print_jobs:
        raise WorkbookPrintError(
            "กรุณาเลือกคลังที่ต้องการพิมพ์",
        )

    try:
        import pythoncom

        import win32com.client
    except ImportError as error:
        raise WorkbookPrintError(
            "ยังไม่ได้ติดตั้ง pywin32 "
            "กรุณาติดตั้งก่อนใช้งานระบบพิมพ์",
        ) from error

    temporary_path = (
        create_temporary_workbook(
            source_path,
        )
    )

    excel = None
    workbook = None

    pythoncom.CoInitialize()

    try:
        excel = (
            win32com.client
            .DispatchEx(
                "Excel.Application",
            )
        )

        excel.Visible = False
        excel.DisplayAlerts = False
        excel.ScreenUpdating = False

        workbook = (
            excel.Workbooks.Open(
                str(
                    temporary_path,
                ),
                UpdateLinks=0,
                ReadOnly=False,
            )
        )

        available_sheets = {
            str(
                workbook
                .Worksheets(
                    index,
                )
                .Name
            )
            for index in range(
                1,
                workbook
                .Worksheets
                .Count + 1,
            )
        }

        print_sheet_names = (
            create_print_sheets(
                workbook=workbook,

                print_jobs=(
                    print_jobs
                ),

                available_sheets=(
                    available_sheets
                ),
            )
        )

        if not print_sheet_names:
            raise WorkbookPrintError(
                "ไม่พบชีตสำหรับพิมพ์",
            )

        select_print_sheets(
            workbook=workbook,

            sheet_names=(
                print_sheet_names
            ),
        )

        excel.ScreenUpdating = True
        excel.DisplayAlerts = True
        excel.Visible = True

        workbook.Activate()

        first_sheet = (
            workbook.Worksheets(
                print_sheet_names[0],
            )
        )

        first_sheet.Activate()

        # Excel Dialog ID 8 คือหน้าต่าง Print
        dialog_result = (
            excel.Dialogs(
                8,
            ).Show()
        )

        # รอให้ Windows ส่งงานเข้า Print Queue
        time.sleep(1)

        return {
            "dialog_opened": True,

            "print_confirmed":
                bool(
                    dialog_result,
                ),

            "sheet_count":
                len(
                    print_sheet_names,
                ),

            "temporary_file":
                str(
                    temporary_path,
                ),
        }

    except WorkbookPrintError:
        raise

    except Exception as error:
        raise WorkbookPrintError(
            f"ไม่สามารถเปิดหน้าต่างพิมพ์ได้: {error}",
        ) from error

    finally:
        if workbook is not None:
            try:
                workbook.Close(
                    SaveChanges=False,
                )
            except Exception:
                pass

        if excel is not None:
            try:
                excel.DisplayAlerts = False
                excel.Quit()
            except Exception:
                pass

        workbook = None
        excel = None

        pythoncom.CoUninitialize()

        try:
            temporary_path.unlink(
                missing_ok=True,
            )
        except Exception:
            pass


def validate_print_jobs(
    warehouses:
        list[dict],
) -> list[dict]:
    valid_jobs = []

    for warehouse in (
        warehouses or []
    ):
        warehouse_name = str(
            warehouse.get(
                "warehouse",
                "",
            ),
        ).strip()

        sheets = [
            str(
                sheet,
            ).strip()
            for sheet in (
                warehouse.get(
                    "sheets",
                    [],
                )
                or []
            )
            if str(
                sheet,
            ).strip()
        ]

        try:
            copies = int(
                warehouse.get(
                    "copies",
                    1,
                ),
            )
        except (
            TypeError,
            ValueError,
        ):
            copies = 1

        copies = max(
            1,
            min(
                copies,
                99,
            ),
        )

        if (
            not warehouse_name
            or not sheets
        ):
            continue

        valid_jobs.append({
            "warehouse":
                warehouse_name,

            "sheets":
                sheets,

            "copies":
                copies,
        })

    return valid_jobs


def create_temporary_workbook(
    source_path: Path,
) -> Path:
    temporary_folder = Path(
        tempfile.gettempdir(),
    ) / "ValuePlus_Print"

    temporary_folder.mkdir(
        parents=True,
        exist_ok=True,
    )

    temporary_name = (
        "ValuePlus_Print_"
        f"{uuid.uuid4().hex}.xlsx"
    )

    temporary_path = (
        temporary_folder
        / temporary_name
    )

    shutil.copy2(
        source_path,
        temporary_path,
    )

    return temporary_path


def create_print_sheets(
    workbook,
    print_jobs:
        list[dict],
    available_sheets:
        set[str],
) -> list[str]:
    print_sheet_names = []
    sequence = 1

    for job in print_jobs:
        for copy_number in range(
            1,
            job["copies"] + 1,
        ):
            for source_sheet_name in (
                job["sheets"]
            ):
                if (
                    source_sheet_name
                    not in
                    available_sheets
                ):
                    raise WorkbookPrintError(
                        "ไม่พบชีต "
                        f"{source_sheet_name} "
                        "ในไฟล์ Excel",
                    )

                source_sheet = (
                    workbook.Worksheets(
                        source_sheet_name,
                    )
                )

                last_sheet = (
                    workbook.Worksheets(
                        workbook
                        .Worksheets
                        .Count,
                    )
                )

                source_sheet.Copy(
                    After=last_sheet,
                )

                copied_sheet = (
                    workbook.Worksheets(
                        workbook
                        .Worksheets
                        .Count,
                    )
                )

                temporary_name = (
                    create_print_sheet_name(
                        sequence=sequence,

                        copy_number=(
                            copy_number
                        ),
                    )
                )

                copied_sheet.Name = (
                    temporary_name
                )

                print_sheet_names.append(
                    temporary_name,
                )

                sequence += 1

    return print_sheet_names


def create_print_sheet_name(
    sequence: int,
    copy_number: int,
) -> str:
    return (
        f"_VP_{sequence:03d}_"
        f"C{copy_number:02d}"
    )[:31]


def select_print_sheets(
    workbook,
    sheet_names:
        list[str],
) -> None:
    first_sheet = (
        workbook.Worksheets(
            sheet_names[0],
        )
    )

    first_sheet.Select()

    for sheet_name in (
        sheet_names[1:]
    ):
        workbook.Worksheets(
            sheet_name,
        ).Select(
            False,
        )