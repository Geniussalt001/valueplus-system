import time
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

    excel = None
    workbook = None
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

        current_stage = "เปิดไฟล์ Excel ปลายทาง"
        workbook = open_excel_workbook(excel, source_path)

        current_stage = "ตรวจสอบรายชื่อชีต"
        sheet_index_by_name = {
            str(workbook.Worksheets.Item(index).Name): index
            for index in range(1, workbook.Worksheets.Count + 1)
        }

        current_stage = "จัดลำดับใบจัดสำหรับพิมพ์"
        print_sheet_entries = create_print_plan(
            print_jobs=print_jobs,
            sheet_index_by_name=sheet_index_by_name,
        )

        if not print_sheet_entries:
            raise WorkbookPrintError("ไม่พบชีตสำหรับพิมพ์")

        current_stage = "แสดงหน้าต่าง Excel"
        excel.EnableEvents = True
        excel.ScreenUpdating = True
        excel.DisplayAlerts = True
        excel.Visible = True

        try:
            excel.WindowState = -4143
        except Exception:
            pass

        time.sleep(0.8)
        bring_excel_to_front(excel)

        first_entry = print_sheet_entries[0]
        current_stage = "เปิดใบจัดลำดับแรกสำหรับพิมพ์"
        first_sheet = activate_print_sheet(
            excel=excel,
            workbook=workbook,
            sheet_index=first_entry["index"],
            sheet_name=first_entry["name"],
        )

        current_stage = "เปิดหน้าต่าง Print ของ Excel"

        # xlDialogPrint = 8
        # เมื่อผู้ใช้กด OK กล่องนี้จะพิมพ์ชีตแรกให้ทันที
        print_dialog = excel.Dialogs.Item(8)
        print_confirmed = bool(print_dialog.Show())

        if not print_confirmed:
            return {
                "dialog_opened": True,
                "print_confirmed": False,
                "sheet_count": 0,
                "workbook_file": str(source_path),
            }

        # ชีตแรกถูกส่งพิมพ์จากกล่อง Print แล้ว
        # จากนั้นจึงพิมพ์ชีตที่เหลือด้วยเครื่องพิมพ์เดียวกัน
        current_stage = "พิมพ์เอกสารที่เหลือตามลำดับ"
        pythoncom.PumpWaitingMessages()
        time.sleep(0.75)

        for sequence, sheet_entry in enumerate(
            print_sheet_entries[1:],
            start=2,
        ):
            sheet_name = sheet_entry["name"]
            current_stage = (
                "เปิดชีตลำดับ "
                f"{sequence}/{len(print_sheet_entries)} "
                f"({sheet_name})"
            )

            worksheet = activate_print_sheet(
                excel=excel,
                workbook=workbook,
                sheet_index=sheet_entry["index"],
                sheet_name=sheet_name,
            )

            current_stage = (
                "ส่งพิมพ์เอกสารลำดับ "
                f"{sequence}/{len(print_sheet_entries)} "
                f"({sheet_name})"
            )

            worksheet.PrintOut(
                Copies=1,
                Preview=False,
                Collate=True,
                IgnorePrintAreas=False,
            )

            pythoncom.PumpWaitingMessages()
            time.sleep(0.25)


        current_stage = "รอส่งงานเข้าสู่เครื่องพิมพ์"
        time.sleep(2)

        return {
            "dialog_opened": True,
            "print_confirmed": True,
            "sheet_count": len(print_sheet_entries),
            "workbook_file": str(source_path),
        }

    except WorkbookPrintError:
        raise
    except Exception as error:
        raise WorkbookPrintError(
            f"ระบบพิมพ์หยุดที่ขั้นตอน “{current_stage}”: {error}",
        ) from error
    finally:
        if workbook is not None:
            try:
                workbook.Close(SaveChanges=False)
            except Exception:
                pass

        if excel is not None:
            try:
                excel.DisplayAlerts = False
                excel.EnableEvents = False
                excel.Quit()
            except Exception:
                pass

        workbook = None
        excel = None
        pythoncom.CoUninitialize()


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

        copies = max(0, min(copies, 99))

        # จำนวน 0 หมายถึงผู้ใช้เลือกไม่พิมพ์คลังนี้
        if not warehouse_name or not sheets or copies == 0:
            continue

        valid_jobs.append(
            {
                "warehouse": warehouse_name,
                "sheets": sheets,
                "copies": copies,
            },
        )

    return valid_jobs


def create_print_plan(
    print_jobs: list[dict],
    sheet_index_by_name: dict[str, int],
) -> list[dict]:
    """สร้างลำดับพิมพ์โดยไม่คัดลอกหรือแก้ไข Workbook."""
    print_sheet_entries = []

    for job in print_jobs:
        for copy_number in range(1, job["copies"] + 1):
            for sheet_name in job["sheets"]:
                sheet_index = sheet_index_by_name.get(sheet_name)

                if sheet_index is None:
                    raise WorkbookPrintError(
                        f"ไม่พบชีต {sheet_name} ในไฟล์ Excel",
                    )

                print_sheet_entries.append(
                    {
                        "index": int(sheet_index),
                        "name": sheet_name,
                        "copy_number": copy_number,
                    },
                )

    return print_sheet_entries


def activate_print_sheet(
    excel,
    workbook,
    sheet_index: int,
    sheet_name: str,
):
    # อ้างด้วยเลขลำดับแทนชื่อ เพราะ Excel บางเครื่องส่ง
    # -2147352565 เมื่อ Worksheets.Item(...) รับค่าเป็นข้อความ
    worksheet = workbook.Worksheets.Item(int(sheet_index))
    worksheet.Visible = -1
    activation_errors = []

    # วิธีหลัก: เปิดหน้าต่าง Workbook ก่อน แล้วจึงเลือกชีต
    try:
        window = workbook.Windows.Item(1)
        window.Visible = True
        window.Activate()
        worksheet.Select()
        return worksheet
    except Exception as error:
        activation_errors.append(error)

    # วิธีสำรองสำหรับ Excel บางรุ่นที่ไม่ยอม Window.Activate()
    try:
        workbook.Activate()
        worksheet.Activate()
        return worksheet
    except Exception as error:
        activation_errors.append(error)

    # วิธีสุดท้าย: Goto จะบังคับให้ Excel สลับ Workbook และชีตให้เอง
    try:
        excel.Goto(
            worksheet.Range("A1"),
            True,
        )
        return worksheet
    except Exception as error:
        activation_errors.append(error)

    details = " | ".join(
        str(error)
        for error in activation_errors
    )
    raise WorkbookPrintError(
        f"ไม่สามารถเปิดชีต {sheet_name} สำหรับพิมพ์ได้: {details}",
    )


def bring_excel_to_front(excel) -> None:
    try:
        import win32con
        import win32gui

        hwnd = int(excel.Hwnd)
        win32gui.ShowWindow(
            hwnd,
            win32con.SW_RESTORE,
        )
        win32gui.SetForegroundWindow(
            hwnd,
        )
    except Exception:
        # Excel ยังเปิดกล่อง Print ได้แม้ Windows
        # ไม่อนุญาตให้บังคับหน้าต่างขึ้นด้านหน้า
        pass
