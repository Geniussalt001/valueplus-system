import argparse
import json
import sys

from valueplus_so import (
    preview_daily_so,
    process_daily_so,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "ValuePlus Daily SO Processor"
        ),
    )

    parser.add_argument(
        "--pdf",
        required=True,
    )

    parser.add_argument(
        "--template",
        required=True,
    )

    parser.add_argument(
        "--output-folder",
        default="",
    )

    parser.add_argument(
        "--preview",
        action="store_true",
    )

    arguments = parser.parse_args()

    try:
        if arguments.preview:
            result = preview_daily_so(
                pdf_path=arguments.pdf,
                template_path=(
                    arguments.template
                ),
            )
        else:
            if not arguments.output_folder:
                raise ValueError(
                    "กรุณาระบุโฟลเดอร์ปลายทาง",
                )

            result = process_daily_so(
                pdf_path=arguments.pdf,
                template_path=(
                    arguments.template
                ),
                output_folder=(
                    arguments.output_folder
                ),
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
