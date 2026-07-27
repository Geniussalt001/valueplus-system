from __future__ import annotations

import subprocess
import sys
import re


IPV4_TITLE_PATTERN = re.compile(
    r"^\s*(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\s*$"
)


def is_remote_session_window_title(title: str) -> bool:
    """รองรับ Express ที่ทำงานอยู่ภายใน Remote Desktop/RemoteApp."""
    value = str(title or "").strip()
    lowered = value.lower()
    return bool(
        IPV4_TITLE_PATTERN.fullmatch(value)
        or "remote desktop" in lowered
        or "remoteapp" in lowered
        or "การเชื่อมต่อเดสก์ท็อประยะไกล" in lowered
    )


def is_express_window_title(title: str) -> bool:
    """รองรับ Express แบบ Native, Web Shortcut และ Remote session."""
    lowered = str(title or "").strip().lower()
    return (
        "express accounting" in lowered
        or "softway" in lowered
        or "web shortcut" in lowered
        or is_remote_session_window_title(title)
    )


class NativeExpressWindow:
    """หน้าต่างสำรองจาก Win32 API เมื่อ pygetwindow มอง Remote App ไม่เห็น."""

    def __init__(self, handle: int, title: str) -> None:
        self.handle = handle
        self.title = title

    @property
    def isMinimized(self) -> bool:  # noqa: N802 - ให้เข้ากับ pygetwindow
        import ctypes

        return bool(ctypes.windll.user32.IsIconic(self.handle))

    def restore(self) -> None:
        import ctypes

        ctypes.windll.user32.ShowWindow(self.handle, 9)

    def activate(self) -> None:
        import ctypes

        user32 = ctypes.windll.user32
        user32.ShowWindow(self.handle, 5)
        if user32.SetForegroundWindow(self.handle):
            return
        if activate_express_by_title(self.title):
            return
        raise RuntimeError(
            "พบหน้าต่าง Express แต่สลับไปใช้งานไม่ได้ "
            "กรุณาเปิด Express IV Bot แบบ Run as administrator"
        )


def find_native_express_window() -> NativeExpressWindow | None:
    if sys.platform != "win32":
        return None

    import ctypes
    from ctypes import wintypes

    user32 = ctypes.windll.user32
    matches: list[NativeExpressWindow] = []
    callback_type = ctypes.WINFUNCTYPE(
        wintypes.BOOL,
        wintypes.HWND,
        wintypes.LPARAM,
    )

    @callback_type
    def enum_callback(hwnd, _lparam):
        length = user32.GetWindowTextLengthW(hwnd)
        if length <= 0:
            return True
        buffer = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buffer, length + 1)
        title = buffer.value
        if is_express_window_title(title):
            matches.append(NativeExpressWindow(int(hwnd), title))
        return True

    user32.EnumWindows(enum_callback, 0)
    return matches[0] if matches else None


def activate_express_by_title(title: str = "") -> bool:
    """สำรองสำหรับ Remote/Web Shortcut ที่ SetForegroundWindow ไม่สำเร็จ."""
    if sys.platform != "win32":
        return False

    safe_title = str(title or "").replace("'", "''")
    script = (
        "$ws = New-Object -ComObject WScript.Shell; "
        f"$title = '{safe_title}'; "
        "$ok = $false; "
        "if ($title) { $ok = $ws.AppActivate($title) }; "
        "if (-not $ok) { $ok = $ws.AppActivate('Express Accounting') }; "
        "if (-not $ok) { $ok = $ws.AppActivate('SOFTWAY') }; "
        "if (-not $ok) { "
        "  $rdp = Get-Process mstsc -ErrorAction SilentlyContinue | "
        "    Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1; "
        "  if ($rdp) { $ok = $ws.AppActivate($rdp.Id) } "
        "}; "
        "if ($ok) { exit 0 } else { exit 1 }"
    )
    creation_flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
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
    return completed.returncode == 0
