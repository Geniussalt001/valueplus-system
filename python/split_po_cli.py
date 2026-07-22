import argparse
import json
import sys

from valueplus_po.pdf_splitter import split_po_pdf


def emit(payload: dict, *, error: bool = False) -> None:
    print(
        json.dumps(payload, ensure_ascii=True),
        file=sys.stderr if error else sys.stdout,
        flush=True,
    )


def emit_log(level: str, message: str) -> None:
    emit({"type": "log", "level": level, "message": message})


def main() -> int:
    parser = argparse.ArgumentParser(description="ValuePlus PO PDF Splitter")
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--output-base", required=True)
    arguments = parser.parse_args()

    try:
        result = split_po_pdf(
            pdf_path=arguments.pdf,
            output_base=arguments.output_base,
            log=emit_log,
        )
        emit({"type": "result", "success": True, "data": result})
        return 0
    except Exception as error:
        emit(
            {
                "type": "result",
                "success": False,
                "message": str(error),
            },
            error=False,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
