import io
import json
import sys


def configure_utf8_stdio() -> None:
    """
    Force the frozen Windows engine to exchange JSON with Tauri as UTF-8.

    PyInstaller runs Python in isolated mode, so PYTHONIOENCODING from the
    parent process is not always enough. Reconfigure both streams before any
    command module writes Thai text.
    """
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name, None)

        if stream is None:
            continue

        try:
            stream.reconfigure(
                encoding="utf-8",
                errors="strict",
                newline="\n",
                write_through=True,
            )
            continue
        except (AttributeError, ValueError):
            pass

        buffer = getattr(stream, "buffer", None)

        if buffer is not None:
            setattr(
                sys,
                stream_name,
                io.TextIOWrapper(
                    buffer,
                    encoding="utf-8",
                    errors="strict",
                    newline="\n",
                    write_through=True,
                ),
            )


configure_utf8_stdio()

import cli
import daily_so_cli
import doll_summary_cli
import express_summary_cli
import print_cli
import product_catalog_cli
import receivables_freight_cli
import split_po_cli


def encoding_test() -> int:
    print(
        json.dumps(
            {
                "success": True,
                "message": "ทดสอบภาษาไทย: มหาชัย สำโรง เชียงใหม่ ขอนแก่น",
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    return 0


COMMANDS = {
    "po": cli.main,
    "daily-so": daily_so_cli.main,
    "doll-summary": doll_summary_cli.main,
    "express-summary": express_summary_cli.main,
    "print": print_cli.main,
    "product-catalog": product_catalog_cli.main,
    "receivables-freight": receivables_freight_cli.main,
    "split-po": split_po_cli.main,
    "encoding-test": encoding_test,
}


def main() -> int:
    if len(sys.argv) < 2:
        print("ValuePlus Engine: missing command", file=sys.stderr)
        return 2

    command_name = sys.argv[1]
    command = COMMANDS.get(command_name)

    if command is None:
        print(f"ValuePlus Engine: unknown command {command_name}", file=sys.stderr)
        return 2

    sys.argv = [sys.argv[0], *sys.argv[2:]]
    return int(command())


if __name__ == "__main__":
    raise SystemExit(main())
