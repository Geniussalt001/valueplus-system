import argparse
import json
import sys

from valueplus_po import build_preview, process_files


def main() -> int:
    parser = argparse.ArgumentParser(description="ValuePlus PO processor")
    parser.add_argument("--pdf", required=True, help="ไฟล์ PDF ต้นทาง")
    parser.add_argument("--template", required=True, help="ไฟล์ Excel Template")
    parser.add_argument("--start-iv", required=True, help="เลข IV เริ่มต้น")
    parser.add_argument("--output", help="ไฟล์ Excel ผลลัพธ์")
    parser.add_argument(
        "--preview",
        action="store_true",
        help="วิเคราะห์และแสดง Preview โดยยังไม่สร้าง Excel",
    )
    args = parser.parse_args()

    try:
        if args.preview:
            result = build_preview(args.pdf, args.template, args.start_iv)
        else:
            if not args.output:
                parser.error("ต้องระบุ --output เมื่อไม่ได้ใช้ --preview")
            result = process_files(
                args.pdf,
                args.template,
                args.start_iv,
                args.output,
            )

        print(json.dumps({"success": True, "data": result}, ensure_ascii=False))
        return 0
    except Exception as error:
        print(
            json.dumps(
                {"success": False, "message": str(error)},
                ensure_ascii=False,
            ),
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
