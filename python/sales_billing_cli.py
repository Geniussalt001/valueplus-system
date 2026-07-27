from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
from pathlib import Path
from typing import Any

from valueplus_billing.cpall_parser import parse_pdf
from valueplus_billing.express_plan import assign_iv_numbers
from valueplus_billing.models import ProductItem, PurchaseOrder
from valueplus_billing.product_database import ProductDatabase
from valueplus_billing.runtime_paths import product_db_path


def write_json(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def preview(pdf_path: Path, start_iv: str) -> dict[str, Any]:
    database = ProductDatabase(product_db_path())
    orders = parse_pdf(pdf_path, database)
    assign_iv_numbers(orders, start_iv)
    return result_payload(orders)


def result_payload(orders: list[PurchaseOrder]) -> dict[str, Any]:
    active_orders = [order for order in orders if order.ready]
    return {
        "orders": [order.to_dict() for order in orders],
        "summary": {
            "orderCount": len(orders),
            "readyCount": len(active_orders),
            "reviewCount": len(orders) - len(active_orders),
            "itemCount": sum(len(order.items) for order in orders),
            "activeItemCount": sum(
                len([item for item in order.items if not item.excluded])
                for order in orders
            ),
        },
    }


def item_from_dict(data: dict[str, Any]) -> ProductItem:
    allowed = ProductItem.__dataclass_fields__.keys()
    return ProductItem(**{key: data[key] for key in allowed if key in data})


def order_from_dict(data: dict[str, Any]) -> PurchaseOrder:
    allowed = PurchaseOrder.__dataclass_fields__.keys()
    values = {
        key: data[key]
        for key in allowed
        if key in data and key != "items"
    }
    values["items"] = [
        item_from_dict(item)
        for item in data.get("items", [])
    ]
    return PurchaseOrder(**values)


def read_orders(request_path: Path) -> list[PurchaseOrder]:
    payload = json.loads(request_path.read_text(encoding="utf-8"))
    orders = [
        order_from_dict(order)
        for order in payload.get("orders", [])
        if order.get("selected", True)
    ]
    if not orders:
        raise ValueError("กรุณาเลือกอย่างน้อย 1 IV")

    invalid = [order.iv_number or order.po_number for order in orders if not order.ready]
    if invalid:
        raise ValueError(
            "พบ IV ที่ยังไม่พร้อมเปิดบิล: " + ", ".join(invalid)
        )
    return orders


def watch_control(
    control_path: Path,
    automation: Any,
    finished: threading.Event,
) -> None:
    last_action = ""
    while not finished.wait(0.2):
        try:
            action = control_path.read_text(encoding="utf-8").strip().upper()
        except OSError:
            action = ""
        if not action or action == last_action:
            continue
        last_action = action
        if action == "STOP":
            automation.stop()
        elif action == "PAUSE":
            automation.request_pause()
        elif action == "RESUME":
            automation.resume()


def run_simulation(
    orders: list[PurchaseOrder],
    control_path: Path,
) -> int:
    paused = False
    total = len(orders)
    for order_index, order in enumerate(orders):
        while True:
            action = read_control(control_path)
            if action == "STOP":
                write_json({
                    "type": "finished",
                    "success": False,
                    "message": "หยุดการทำงานแล้ว",
                })
                return 1
            if action == "PAUSE":
                if not paused:
                    paused = True
                    write_json({
                        "type": "paused",
                        "message": "พักหลังจบ IV ปัจจุบัน",
                    })
                time.sleep(0.15)
                continue
            paused = False
            break

        active_items = [item for item in order.items if not item.excluded]
        write_json({
            "type": "progress",
            "orderIndex": order_index,
            "orderTotal": total,
            "ivNumber": order.iv_number,
            "poNumber": order.po_number,
            "step": "เริ่มจำลองการเปิดบิล",
            "itemIndex": -1,
            "itemTotal": len(active_items),
            "detail": order.warehouse_group,
        })
        for item_index, item in enumerate(active_items):
            if read_control(control_path) == "STOP":
                write_json({
                    "type": "finished",
                    "success": False,
                    "message": "หยุดการทำงานแล้ว",
                })
                return 1
            write_json({
                "type": "progress",
                "orderIndex": order_index,
                "orderTotal": total,
                "ivNumber": order.iv_number,
                "poNumber": order.po_number,
                "step": "ตรวจรายการสินค้า",
                "itemIndex": item_index,
                "itemTotal": len(active_items),
                "detail": f"{item.express_input_code} • {item.quantity:,.2f}",
            })
            time.sleep(0.035)

    write_json({
        "type": "finished",
        "success": True,
        "message": f"จำลองสำเร็จครบ {total} IV",
    })
    return 0


def read_control(control_path: Path) -> str:
    try:
        return control_path.read_text(encoding="utf-8").strip().upper()
    except OSError:
        return ""


def run_automation(
    orders: list[PurchaseOrder],
    control_path: Path,
) -> int:
    if os.name != "nt":
        raise RuntimeError("ระบบเปิดบิลจริงรองรับเฉพาะ Windows")

    from valueplus_billing.express_automation import ExpressAutomation

    result = {"success": False, "message": ""}
    finished = threading.Event()

    def status_callback(
        order_index: int,
        step: str,
        item_index: int,
        detail: str,
    ) -> None:
        order = orders[order_index]
        write_json({
            "type": "progress",
            "orderIndex": order_index,
            "orderTotal": len(orders),
            "ivNumber": order.iv_number,
            "poNumber": order.po_number,
            "step": step,
            "itemIndex": item_index,
            "itemTotal": len([item for item in order.items if not item.excluded]),
            "detail": detail,
        })

    def finish_callback(success: bool, message: str) -> None:
        result["success"] = success
        result["message"] = message
        finished.set()

    automation = ExpressAutomation(status_callback, finish_callback)
    watcher = threading.Thread(
        target=watch_control,
        args=(control_path, automation, finished),
        daemon=True,
    )
    watcher.start()
    automation.run_orders(orders)
    finished.set()
    write_json({
        "type": "finished",
        "success": result["success"],
        "message": result["message"],
    })
    return 0 if result["success"] else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    preview_parser = subparsers.add_parser("preview")
    preview_parser.add_argument("--pdf", required=True)
    preview_parser.add_argument("--start-iv", required=True)

    execute_parser = subparsers.add_parser("execute")
    execute_parser.add_argument("--request", required=True)
    execute_parser.add_argument("--control", required=True)
    execute_parser.add_argument("--simulate", action="store_true")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        if args.command == "preview":
            data = preview(Path(args.pdf), args.start_iv)
            write_json({"success": True, "data": data})
            return 0

        request_path = Path(args.request)
        control_path = Path(args.control)
        control_path.write_text("", encoding="utf-8")
        orders = read_orders(request_path)
        if args.simulate:
            return run_simulation(orders, control_path)
        return run_automation(orders, control_path)
    except Exception as error:
        write_json({
            "type": "finished" if args.command == "execute" else "error",
            "success": False,
            "message": str(error),
        })
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
