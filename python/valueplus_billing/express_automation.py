from __future__ import annotations

import subprocess
import sys
import threading
import time
from collections.abc import Callable

import pyautogui
import pygetwindow

from .automation_timing import (
    AFTER_INVOICE_SAVE_DELAY,
    BETWEEN_SAVE_ESC_DELAY,
    DATE_DELETE_DELAY,
    DATE_DIGIT_DELAY,
    DATE_SELECT_DELAY,
    DATE_VALUE_SETTLE_DELAY,
    DEFAULT_FIELD_DELAY,
    DEFAULT_KEY_DELAY,
    FOCUS_SETTLE_DELAY,
    HEADER_FIELD_SETTLE_DELAY,
    IV_FIELD_SETTLE_DELAY,
    LAST_ITEM_SETTLE_DELAY,
    NEW_INVOICE_SETTLE_DELAY,
    ORDER_START_SETTLE_DELAY,
    SALES_AREA_SETTLE_DELAY,
    WAREHOUSE_DELETE_DELAY,
    WAREHOUSE_SELECT_DELAY,
    WAREHOUSE_VALUE_SETTLE_DELAY,
    item_code_settle_delay,
)
from .models import ProductItem, PurchaseOrder
from .window_detection import (
    find_native_express_window,
    is_express_window_title,
)


StatusCallback = Callable[[int, str, int, str], None]
FinishCallback = Callable[[bool, str], None]

class AutomationStopped(Exception):
    pass


class ExpressAutomation:
    """คีย์ Express โปรไฟล์ BALANCED SAFE ด้วย Windows SendKeys."""

    def __init__(
        self,
        status_callback: StatusCallback,
        finish_callback: FinishCallback,
        key_delay: float = DEFAULT_KEY_DELAY,
        field_delay: float = DEFAULT_FIELD_DELAY,
    ) -> None:
        self.status_callback = status_callback
        self.finish_callback = finish_callback
        self.key_delay = key_delay
        self.field_delay = field_delay
        self.stop_event = threading.Event()
        self.pause_requested = threading.Event()
        self.resume_event = threading.Event()
        self.resume_event.set()
        pyautogui.PAUSE = key_delay
        pyautogui.FAILSAFE = True

    @staticmethod
    def find_express_window():
        active_window = pygetwindow.getActiveWindow()
        if active_window is not None:
            if is_express_window_title(active_window.title):
                return active_window

        for title in pygetwindow.getAllTitles():
            if is_express_window_title(title):
                windows = pygetwindow.getWindowsWithTitle(title)
                if windows:
                    return windows[0]
        return find_native_express_window()

    def stop(self) -> None:
        self.stop_event.set()
        self.resume_event.set()

    def request_pause(self) -> None:
        self.pause_requested.set()

    def resume(self) -> None:
        self.pause_requested.clear()
        self.resume_event.set()

    def _check_stop(self) -> None:
        if self.stop_event.is_set():
            raise AutomationStopped("ผู้ใช้กดหยุดฉุกเฉิน")

    def _sleep(self, seconds: float) -> None:
        deadline = (
            time.monotonic()
            + max(0.0, float(seconds))
        )

        while True:
            self._check_stop()
            remaining = (
                deadline
                - time.monotonic()
            )
            if remaining <= 0:
                return

            self.stop_event.wait(
                min(0.05, remaining),
            )

    def _focus_express(self) -> str:
        window = self.find_express_window()
        if window is None:
            raise RuntimeError(
                "ไม่พบหน้าต่าง Express, SOFTWAY หรือ Remote Desktop\n\n"
                "1) เปิด Remote Desktop ที่ใช้งาน Express\n"
                "2) เข้าเมนูขายเงินเชื่อ / IV\n"
                "3) คลิกในหน้าต่าง Remote Desktop แล้วกด Home"
            )
        if window.isMinimized:
            window.restore()
        window.activate()
        self._sleep(FOCUS_SETTLE_DELAY)
        return str(window.title)

    def _press(self, key: str, presses: int = 1) -> None:
        for _ in range(presses):
            self._check_stop()
            self._focus_express()
            pyautogui.press(key)
            if self.key_delay > 0:
                self._sleep(self.key_delay)

    def _hotkey(self, *keys: str) -> None:
        self._check_stop()
        self._focus_express()
        pyautogui.hotkey(*keys)
        if self.field_delay > 0:
            self._sleep(self.field_delay)

    @staticmethod
    def _escape_sendkeys(value: str) -> str:
        escaped = str(value).replace("'", "''")
        replacements = {
            "~": "{~}",
            "+": "{+}",
            "^": "{^}",
            "%": "{%}",
            "(": "{(}",
            ")": "{)}",
            "[": "{[}",
            "]": "{]}",
            "{": "{{}",
            "}": "{}}",
        }
        for source, target in replacements.items():
            escaped = escaped.replace(source, target)
        return escaped

    def _type_text(self, value: str) -> None:
        """เทียบเท่า typeText/sendKeysDirect ใน express-bot-1."""
        self._check_stop()
        text = str(value).strip()
        if not text:
            return

        title = self._focus_express().replace("'", "''")
        escaped_text = self._escape_sendkeys(text)
        script = (
            "$wshell = New-Object -ComObject WScript.Shell; "
            f"$null = $wshell.AppActivate('{title}'); "
            "Start-Sleep -Milliseconds 50; "
            "Add-Type -AssemblyName System.Windows.Forms; "
            f"[System.Windows.Forms.SendKeys]::SendWait('{escaped_text}')"
        )
        creation_flags = (
            subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        )
        completed = subprocess.run(
            [
                "powershell.exe",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                script,
            ],
            check=False,
            capture_output=True,
            text=True,
            creationflags=creation_flags,
        )
        if completed.returncode != 0:
            raise RuntimeError("Windows SendKeys ส่งข้อความเข้า Express ไม่สำเร็จ")
        if self.field_delay > 0:
            self._sleep(self.field_delay)

    def _clear_and_type(self, value: str) -> None:
        self._hotkey("ctrl", "a")
        self._press("backspace")
        self._type_text(value)

    def _type_express_date(self, value: str) -> None:
        """ล้าง masked date แล้วคีย์ ddmmyy ทีละตัวตามที่ Express รับได้."""
        digits = "".join(character for character in str(value) if character.isdigit())
        if len(digits) != 6:
            raise ValueError(f"วันที่ Express ต้องมี 6 หลัก แต่ได้รับ {value!r}")

        self._hotkey("ctrl", "a")
        self._sleep(DATE_SELECT_DELAY)
        self._press("backspace", 1)
        self._sleep(DATE_DELETE_DELAY)
        for digit in digits:
            self._type_text(digit)
            self._sleep(DATE_DIGIT_DELAY)
        self._sleep(DATE_VALUE_SETTLE_DELAY)

    def _status(
        self,
        order_index: int,
        step: str,
        item_index: int = -1,
        detail: str = "",
    ) -> None:
        self.status_callback(order_index, step, item_index, detail)

    def run_orders(self, orders: list[PurchaseOrder]) -> None:
        try:
            for order_index, order in enumerate(orders):
                self._run_one_order(order, order_index)
                if order_index < len(orders) - 1:
                    self._wait_if_pause_requested(order_index)
            self.finish_callback(
                True,
                f"บันทึก IV สำเร็จครบ {len(orders)} ใบ",
            )
        except AutomationStopped as exc:
            self.finish_callback(False, str(exc))
        except pyautogui.FailSafeException:
            self.finish_callback(
                False,
                "หยุดฉุกเฉินด้วยการเลื่อนเมาส์ไปมุมซ้ายบน",
            )
        except Exception as exc:
            self.finish_callback(False, str(exc))

    def run_one_order(self, order: PurchaseOrder) -> None:
        self.run_orders([order])

    def _run_one_order(
        self,
        order: PurchaseOrder,
        order_index: int,
    ) -> None:
        self._focus_express()
        self._sleep(ORDER_START_SETTLE_DELAY)

        # ลำดับ header ยึดตาม express-bot-1/src/expressBot.js
        self._status(order_index, "สร้าง IV ใหม่", detail="Alt+A")
        self._hotkey("alt", "a")
        self._sleep(NEW_INVOICE_SETTLE_DELAY)

        self._press("enter", 1)
        self._status(
            order_index,
            "พิมพ์เลขที่เอกสาร",
            detail=order.iv_number,
        )
        self._type_text(order.iv_number)
        self._sleep(IV_FIELD_SETTLE_DELAY)

        self._press("enter", 1)
        self._status(
            order_index,
            "ล้างและคีย์วันที่ทีละหลัก",
            detail=" ".join(order.express_date),
        )
        self._type_express_date(order.express_date)

        self._press("enter", 1)
        self._status(order_index, "พิมพ์รหัสลูกค้า", detail="MT001")
        self._type_text("MT001")
        self._sleep(HEADER_FIELD_SETTLE_DELAY)

        self._press("enter", 4)
        self._status(
            order_index,
            "พิมพ์เลขอ้างอิง PO",
            detail=order.po_number,
        )
        self._type_text(order.po_number)
        self._sleep(HEADER_FIELD_SETTLE_DELAY)

        self._press("enter", 4)
        self._status(
            order_index,
            "พิมพ์เขตการขาย",
            detail=order.sales_area_code,
        )
        self._type_text(order.sales_area_code)
        self._sleep(SALES_AREA_SETTLE_DELAY)

        self._press("enter", 8)
        active_items = [item for item in order.items if not item.excluded]
        for item_index, item in enumerate(active_items):
            self._key_item(item, order_index, item_index)
            # กด Enter 3 ครั้งทุกรายการ (รวมถึงรายการสุดท้าย) เพื่อยืนยันราคาและบันทึกบรรทัดสินค้าลงตาราง
            self._press("enter", 3)

        self._status(
            order_index,
            "รอ Express ยืนยันรายการสุดท้าย",
            len(active_items) - 1,
            f"{LAST_ITEM_SETTLE_DELAY:.2f} วินาที",
        )
        self._sleep(LAST_ITEM_SETTLE_DELAY)
        self._status(
            order_index,
            "บันทึก IV",
            len(active_items) - 1,
            "Esc 2 ครั้ง",
        )
        self._press("esc", 1)
        self._sleep(BETWEEN_SAVE_ESC_DELAY)
        self._press("esc", 1)
        self._sleep(AFTER_INVOICE_SAVE_DELAY)

    def _wait_if_pause_requested(self, order_index: int) -> None:
        if not self.pause_requested.is_set():
            return
        self.resume_event.clear()
        self._status(
            order_index,
            "พักการทำงาน",
            detail="กด Insert เพื่อทำ IV ถัดไป",
        )
        while not self.resume_event.wait(0.1):
            self._check_stop()

    def _key_item(
        self,
        item: ProductItem,
        order_index: int,
        item_index: int,
    ) -> None:
        self._status(
            order_index,
            "พิมพ์รหัสสินค้า",
            item_index,
            item.express_input_code,
        )
        self._type_text(item.express_input_code)

        self._press("enter", 1)
        settle_delay = item_code_settle_delay(item)
        self._status(
            order_index,
            "รอ Express ยืนยันสินค้า",
            item_index,
            f"{item.express_input_code} • {settle_delay:.2f} วินาที",
        )
        self._sleep(settle_delay)
        self._press("enter", 1)
        self._status(order_index, "เปลี่ยนคลังสินค้า", item_index, "02")
        self._hotkey("ctrl", "a")
        self._sleep(WAREHOUSE_SELECT_DELAY)
        self._press("backspace", 1)
        self._sleep(WAREHOUSE_DELETE_DELAY)
        self._type_text("02")
        self._sleep(WAREHOUSE_VALUE_SETTLE_DELAY)

        self._press("enter", 1)
        quantity = f"{item.quantity:.2f}"
        self._status(order_index, "พิมพ์จำนวน", item_index, quantity)
        self._type_text(quantity)

        self._press("enter", 3)
        price = f"{item.unit_price:.2f}"
        self._status(
            order_index,
            "พิมพ์ราคาต่อหน่วย",
            item_index,
            price,
        )
        self._clear_and_type(price)
