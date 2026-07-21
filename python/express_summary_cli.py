import argparse
import json
import sys

from valueplus_summary import (
    parse_express_csv,
)

from valueplus_catalog import (
    import_express_csv,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "ValuePlus Express Summary"
        ),
    )

    parser.add_argument(
        "--csv",
        required=True,
    )

    parser.add_argument(
        "--database",
        required=True,
    )

    arguments = parser.parse_args()

    try:
        result = parse_express_csv(
            arguments.csv,
        )

        catalog_result = import_express_csv(
            database_path=arguments.database,
            csv_path=arguments.csv,
        )

        # หน้า Express ต้องใช้เพียงผลสรุปการอัปเดตฐานข้อมูล
        # ไม่ส่งรายการสินค้าทั้งฐานกลับไปเพื่อลดขนาดข้อมูลระหว่าง Python/Tauri
        catalog_result.pop(
            "products",
            None,
        )

        result["catalog"] = catalog_result

        print(
            json.dumps(
                {
                    "success": True,
                    "data": result,
                },
                ensure_ascii=False,
            ),
            flush=True,
        )

        return 0
    except Exception as error:
        print(
            json.dumps(
                {
                    "success": False,
                    "message": str(
                        error,
                    ),
                },
                ensure_ascii=False,
            ),
            flush=True,
        )

        return 1


if __name__ == "__main__":
    raise SystemExit(
        main(),
    )
