import argparse
import json
import sys

from valueplus_po import (
    add_template_products,
    build_preview,
    process_files,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="ValuePlus PO processor")
    parser.add_argument("--pdf", help="ไฟล์ PDF ต้นทาง")
    parser.add_argument("--template", required=True, help="ไฟล์ Excel Template")
    parser.add_argument("--start-iv", help="เลข IV เริ่มต้น")
    parser.add_argument("--output", help="ไฟล์ Excel ผลลัพธ์")
    parser.add_argument(
        "--quantity-overrides-json",
        default="{}",
        help="ข้อมูลตัดยอดสินค้าในรูปแบบ JSON",
    )
    parser.add_argument(
        "--add-products-json",
        help="เพิ่มหรือแก้ไขสินค้าใน Template จาก JSON",
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="วิเคราะห์และแสดง Preview โดยยังไม่สร้าง Excel",
    )
    args = parser.parse_args()

    try:
        if args.add_products_json:
            products = json.loads(args.add_products_json)
            if not isinstance(products, list):
                raise ValueError("ข้อมูลสินค้าที่เพิ่มต้องเป็น Array")
            result = add_template_products(args.template, products)
        else:
            if not args.pdf:
                parser.error("ต้องระบุ --pdf")
            if not args.start_iv:
                parser.error("ต้องระบุ --start-iv")

            if args.preview:
                result = build_preview(args.pdf, args.template, args.start_iv)
            else:
                if not args.output:
                    parser.error("ต้องระบุ --output เมื่อไม่ได้ใช้ --preview")
                quantity_overrides = json.loads(args.quantity_overrides_json)
                if not isinstance(quantity_overrides, dict):
                    raise ValueError("ข้อมูลตัดยอดต้องเป็น Object")
                result = process_files(
                    args.pdf,
                    args.template,
                    args.start_iv,
                    args.output,
                    quantity_overrides=quantity_overrides,
                )

        print(json.dumps({"success": True, "data": result}, ensure_ascii=True))
        return 0
    except Exception as error:
        print(
            json.dumps(
                {"success": False, "message": str(error)},
                ensure_ascii=True,
            ),
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
