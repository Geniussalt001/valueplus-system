import argparse
import json
import sys

from valueplus_po.printer import (
    open_print_dialog,
)


def main() -> int:
    parser = (
        argparse
        .ArgumentParser(
            description=(
                "ValuePlus Excel "
                "Print Processor"
            ),
        )
    )

    parser.add_argument(
        "--workbook",
        required=True,
        help=(
            "ตำแหน่งไฟล์ Excel "
            "ที่ต้องการพิมพ์"
        ),
    )

    parser.add_argument(
        "--jobs-json",
        required=True,
        help=(
            "รายการคลัง ชีต "
            "และจำนวนชุดในรูปแบบ JSON"
        ),
    )

    arguments = (
        parser.parse_args()
    )

    try:
        print_jobs = (
            json.loads(
                arguments.jobs_json,
            )
        )

        if not isinstance(
            print_jobs,
            list,
        ):
            raise ValueError(
                "ข้อมูล Print Jobs "
                "ต้องเป็นรายการ",
            )

        result = (
            open_print_dialog(
                workbook_path=(
                    arguments.workbook
                ),

                warehouses=(
                    print_jobs
                ),
            )
        )

        print(
            json.dumps(
                {
                    "success": True,
                    "data": result,
                },
                ensure_ascii=False,
            ),
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
            file=sys.stderr,
        )

        return 1


if __name__ == "__main__":
    raise SystemExit(
        main(),
    )