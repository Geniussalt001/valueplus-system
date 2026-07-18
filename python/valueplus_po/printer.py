import shutil
import tempfile
import time
import uuid
import zipfile
from pathlib import Path


class WorkbookPrintError(ValueError):
    pass


def open_print_dialog(
    workbook_path: str | Path,
    warehouses: list[dict],
) -> dict:
    source_path = Path(workbook_path).resolve()

    if not source_path.is_file():
        raise WorkbookPrintError(f"ไม่พบไฟล์ Excel: {source_path}")

    validate_workbook_container(source_path)
    print_jobs = validate_print_jobs(warehouses)

    if not print_jobs:
        raise WorkbookPrintError("กรุณาเลือกคลังที่ต้องการพิมพ์")

    try:
        import pythoncom
        import win32com.client
    except ImportError as error:
        raise WorkbookPrintError(
            "ยังไม่ได้ติดตั้ง pywin32 กรุณาติดตั้งก่อนใช้งานระบบพิมพ์",
        ) from error

    temporary_path = create_temporary_workbook(source_path)
    excel = None
    source_workbook = None
    print_workbook = None
    current_stage = "เริ่มต้นระบบพิมพ์"

    pythoncom.CoInitialize()

    try:
        current_stage = "เปิด Microsoft Excel"
        excel = win32com.client.DispatchEx("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        excel.ScreenUpdating = False
        excel.EnableEvents = False
        excel.AskToUpdateLinks = False

        current_stage = "เปิดไฟล์ Excel ต้นฉบับ"
        source_workbook = open_excel_workbook(excel, temporary_path)

        current_stage = "ตรวจสอบรายชื่อชีต"
        available_sheets = {
            str(source_workbook.Worksheets.Item(index).Name)
            for index in range(1, source_workbook.Worksheets.Count + 1)
        }

        current_stage = "สร้าง Workbook สำหรับพิมพ์"
        print_workbook, print_sheets = create_print_workbook(
            excel=excel,
            source_workbook=source_workbook,
            print_jobs=print_jobs,
            available_sheets=available_sheets,
        )

        if not print_sheets:
            raise WorkbookPrintError("ไม่พบชีตสำหรับพิมพ์")

        current_stage = "แสดงหน้าต่าง Excel"
        print_workbook.Activate()
        print_workbook.Worksheets.Item(1).Activate()

        excel.EnableEvents = True
        excel.ScreenUpdating = True
        excel.DisplayAlerts = True
        excel.Visible = True

        try:
            excel.WindowState = -4143
        except Exception:
            pass

        current_stage = "เปิดหน้าต่างเลือกเครื่องพิมพ์"

        # xlDialogPrinterSetup = 9
        # หน้าต่างนี้ใช้เลือกเครื่องพิมพ์อย่างเดียว
        printer_dialog = excel.Dialogs.Item(9)
        printer_confirmed = bool(printer_dialog.Show())

        if not printer_confirmed:
            return {
                "dialog_opened": True,
                "print_confirmed": False,
                "sheet_count": 0,
                "temporary_file": str(temporary_path),
            }

        selected_printer = str(excel.ActivePrinter)

        current_stage = "พิมพ์เอกสารตามลำดับ"

        for sequence, worksheet in enumerate(
            print_sheets,
            start=1,
        ):
            sheet_name = str(worksheet.Name)
            current_stage = (
                "เปิดชีตลำดับ "
                f"{sequence}/{len(print_sheets)} "
                f"({sheet_name})"
            )
            worksheet.Activate()

            current_stage = (
                "ส่งพิมพ์เอกสารลำดับ "
                f"{sequence}/{len(print_sheets)} "
                f"({sheet_name})"
            )

            worksheet.PrintOut(
                Copies=1,
                Preview=False,
                ActivePrinter=selected_printer,
                Collate=True,
                IgnorePrintAreas=False,
            )

            time.sleep(0.15)

        current_stage = "รอส่งงานเข้าสู่เครื่องพิมพ์"
        time.sleep(2)

        return {
            "dialog_opened": True,
            "print_confirmed": True,
            "sheet_count": len(print_sheets),
            "temporary_file": str(temporary_path),
        }

    except WorkbookPrintError:
        raise
    except Exception as error:
        raise WorkbookPrintError(
            f"ระบบพิมพ์หยุดที่ขั้นตอน “{current_stage}”: {error}",
        ) from error
    finally:
        if print_workbook is not None:
            try:
                print_workbook.Close(SaveChanges=False)
            except Exception:
                pass

        if source_workbook is not None:
            try:
                source_workbook.Close(SaveChanges=False)
            except Exception:
                pass

        if excel is not None:
            try:
                excel.DisplayAlerts = False
                excel.EnableEvents = False
                excel.Quit()
            except Exception:
                pass

        print_workbook = None
        source_workbook = None
        excel = None
        pythoncom.CoUninitialize()

        try:
            temporary_path.unlink(missing_ok=True)
        except Exception:
            pass


def open_excel_workbook(excel, workbook_path: Path):
    common_options = {
        "Filename": str(workbook_path),
        "UpdateLinks": 0,
        "ReadOnly": True,
        "IgnoreReadOnlyRecommended": True,
        "AddToMru": False,
        "Notify": False,
    }

    normal_error = None

    try:
        return excel.Workbooks.Open(**common_options)
    except Exception as error:
        normal_error = error

    try:
        return excel.Workbooks.Open(**common_options, CorruptLoad=1)
    except Exception as repair_error:
        raise WorkbookPrintError(
            "Excel ไม่สามารถเปิดไฟล์สำหรับพิมพ์ได้ "
            "ทั้งโหมดปกติและโหมดซ่อมแซม\n"
            f"เปิดปกติ: {normal_error}\n"
            f"เปิดแบบซ่อมแซม: {repair_error}",
        ) from repair_error


def validate_workbook_container(workbook_path: Path) -> None:
    try:
        with zipfile.ZipFile(workbook_path, "r") as workbook_zip:
            broken_part = workbook_zip.testzip()
            if broken_part:
                raise WorkbookPrintError(
                    f"ไฟล์ Excel เสียหายบริเวณ: {broken_part}",
                )
    except zipfile.BadZipFile as error:
        raise WorkbookPrintError(
            "ไฟล์ที่บันทึกไม่ใช่ไฟล์ Excel หรือโครงสร้างไฟล์เสียหาย",
        ) from error


def validate_print_jobs(warehouses: list[dict]) -> list[dict]:
    valid_jobs = []

    for warehouse in warehouses or []:
        warehouse_name = str(warehouse.get("warehouse", "")).strip()
        sheets = [
            str(sheet).strip()
            for sheet in (warehouse.get("sheets", []) or [])
            if str(sheet).strip()
        ]

        try:
            copies = int(warehouse.get("copies", 1))
        except (TypeError, ValueError):
            copies = 1

        copies = max(1, min(copies, 99))

        if not warehouse_name or not sheets:
            continue

        valid_jobs.append(
            {
                "warehouse": warehouse_name,
                "sheets": sheets,
                "copies": copies,
            },
        )

    return valid_jobs


def create_temporary_workbook(source_path: Path) -> Path:
    temporary_folder = Path(tempfile.gettempdir()) / "ValuePlus_Print"
    temporary_folder.mkdir(parents=True, exist_ok=True)

    temporary_name = f"ValuePlus_Source_{uuid.uuid4().hex}.xlsx"
    temporary_path = temporary_folder / temporary_name
    shutil.copy2(source_path, temporary_path)
    return temporary_path


def create_print_workbook(
    excel,
    source_workbook,
    print_jobs: list[dict],
    available_sheets: set[str],
):
    print_workbook = excel.Workbooks.Add()
    print_sheets = []
    sequence = 1

    try:
        for job in print_jobs:
            for copy_number in range(1, job["copies"] + 1):
                for source_sheet_name in job["sheets"]:
                    if source_sheet_name not in available_sheets:
                        raise WorkbookPrintError(
                            f"ไม่พบชีต {source_sheet_name} ในไฟล์ Excel",
                        )

                    source_sheet = source_workbook.Worksheets.Item(
                        source_sheet_name,
                    )
                    last_sheet = print_workbook.Worksheets.Item(
                        print_workbook.Worksheets.Count,
                    )
                    source_sheet.Copy(After=last_sheet)

                    copied_sheet = print_workbook.Worksheets.Item(
                        print_workbook.Worksheets.Count,
                    )
                    copied_name = create_print_sheet_name(
                        sequence=sequence,
                        copy_number=copy_number,
                    )

                    copied_sheet.Name = copied_name
                    copied_sheet.Visible = -1
                    print_sheets.append(copied_sheet)
                    sequence += 1

        if not print_sheets:
            raise WorkbookPrintError("ไม่มีชีตสำหรับสร้าง Workbook พิมพ์")

        return print_workbook, print_sheets

    except Exception:
        try:
            print_workbook.Close(SaveChanges=False)
        except Exception:
            pass
        raise


def create_print_sheet_name(sequence: int, copy_number: int) -> str:
    return f"_VP_{sequence:03d}_C{copy_number:02d}"[:31]