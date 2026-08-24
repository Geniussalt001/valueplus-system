import argparse
import json

from valueplus_summary.sales_cn_workbook import update_sales_cn_report


def main() -> int:
    parser = argparse.ArgumentParser(description="ValuePlus Sales/CN Summary")
    parser.add_argument("--source", required=True)
    parser.add_argument("--report", required=True)
    arguments = parser.parse_args()

    try:
        result = update_sales_cn_report(arguments.source, arguments.report)
        print(json.dumps({"success": True, "data": result}, ensure_ascii=False), flush=True)
        return 0
    except Exception as error:
        print(json.dumps({"success": False, "message": str(error)}, ensure_ascii=False), flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
