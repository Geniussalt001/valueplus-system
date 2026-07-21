import argparse
import json
import sys

from valueplus_catalog import (
    create_product,
    delete_product,
    import_express_csv,
    initialize_database,
    list_products,
    set_product_active,
    update_product,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="ValuePlus Product Catalog",
    )
    parser.add_argument(
        "--database",
        required=True,
    )

    subparsers = parser.add_subparsers(
        dest="command",
        required=True,
    )

    import_parser = subparsers.add_parser(
        "import-express",
    )
    import_parser.add_argument(
        "--csv",
        required=True,
    )

    list_parser = subparsers.add_parser(
        "list",
    )
    list_parser.add_argument(
        "--active-only",
        action="store_true",
    )

    active_parser = subparsers.add_parser(
        "set-active",
    )
    active_parser.add_argument("--code", required=True)
    active_parser.add_argument(
        "--active",
        choices=("0", "1"),
        required=True,
    )

    update_parser = subparsers.add_parser(
        "update",
    )
    update_parser.add_argument("--code", required=True)
    update_parser.add_argument("--display-name")
    update_parser.add_argument("--line-name")
    update_parser.add_argument("--order", type=int)

    create_parser = subparsers.add_parser(
        "create",
    )
    create_parser.add_argument("--code", required=True)
    create_parser.add_argument("--display-name", required=True)
    create_parser.add_argument("--line-name", default="")
    create_parser.add_argument("--order", type=int)
    create_parser.add_argument(
        "--active",
        choices=("0", "1"),
        default="1",
    )

    delete_parser = subparsers.add_parser(
        "delete",
    )
    delete_parser.add_argument("--code", required=True)

    arguments = parser.parse_args()

    try:
        initialize_database(arguments.database)

        if arguments.command == "import-express":
            data = import_express_csv(
                arguments.database,
                arguments.csv,
            )
        elif arguments.command == "list":
            data = {
                "products": list_products(
                    arguments.database,
                    include_inactive=not arguments.active_only,
                ),
            }
        elif arguments.command == "set-active":
            data = set_product_active(
                arguments.database,
                arguments.code,
                arguments.active == "1",
            )
        elif arguments.command == "update":
            data = update_product(
                arguments.database,
                arguments.code,
                display_name=arguments.display_name,
                line_name=arguments.line_name,
                display_order=arguments.order,
            )
        elif arguments.command == "create":
            data = create_product(
                arguments.database,
                product_code=arguments.code,
                display_name=arguments.display_name,
                line_name=arguments.line_name,
                display_order=arguments.order,
                active=arguments.active == "1",
            )
        else:
            data = delete_product(
                arguments.database,
                arguments.code,
            )

        print(
            json.dumps(
                {
                    "success": True,
                    "data": data,
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
                    "message": str(error),
                },
                ensure_ascii=False,
            ),
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
