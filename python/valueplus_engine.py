import sys

import cli
import daily_so_cli
import doll_summary_cli
import express_summary_cli
import print_cli
import product_catalog_cli
import split_po_cli


COMMANDS = {
    "po": cli.main,
    "daily-so": daily_so_cli.main,
    "doll-summary": doll_summary_cli.main,
    "express-summary": express_summary_cli.main,
    "print": print_cli.main,
    "product-catalog": product_catalog_cli.main,
    "split-po": split_po_cli.main,
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
