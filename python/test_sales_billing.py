from __future__ import annotations

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from valueplus_billing.cpall_parser import ITEM_PATTERN, _parse_number
from valueplus_common.cpall_pdf import normalize_wrapped_item_quantities
from valueplus_billing.express_plan import increment_iv
from valueplus_billing.mappings import (
    normalize_warehouse,
    to_express_sales_area_code,
)
from valueplus_billing.models import ProductItem
from valueplus_billing.product_database import ProductDatabase
from valueplus_billing.product_mapping_store import save_product_mapping
from valueplus_billing.runtime_paths import product_db_path


class SalesBillingRulesTest(unittest.TestCase):
    def test_increment_iv_keeps_number_width(self) -> None:
        self.assertEqual(increment_iv("VPR6907001", 0), "VPR6907001")
        self.assertEqual(increment_iv("VPR6907001", 24), "VPR6907025")

    def test_warehouse_alias_and_express_area(self) -> None:
        self.assertEqual(
            normalize_warehouse("คลัง BDC โชคชัย คลังดี")[0],
            "โชคชัย",
        )
        self.assertEqual(
            normalize_warehouse("คลัง BDC นครราชสีมา_คลังดี")[0],
            "โคราช",
        )
        self.assertEqual(to_express_sales_area_code("CP001"), "CP01")
        self.assertEqual(to_express_sales_area_code("CP028"), "CP28")

    def test_pdf_number_pattern_accepts_thousands_separator(self) -> None:
        text = (
            "6002424 / INC TEST\n"
            "1 1234567890123 ยูมิยูมิ มิลค์เค้ก 55 กรัม "
            "1 8,000 1 10.30 "
        )
        match = ITEM_PATTERN.search(text)
        self.assertIsNotNone(match)
        assert match is not None
        self.assertEqual(_parse_number(match.group(4)), 8000.0)

    def test_pdf_row_repairs_wrapped_four_digit_quantity(self) -> None:
        text = (
            "6002797 / EXC 7.00 0.00\n"
            "16 8859898700279 สินค้าทดสอบ 50 G. "
            "1 5,390. 0 7.05 0.00 0.00 0.00 0.00 37,999.50\n"
            "00\n"
        )

        match = ITEM_PATTERN.search(
            normalize_wrapped_item_quantities(text),
        )

        self.assertIsNotNone(match)
        assert match is not None
        self.assertEqual(_parse_number(match.group(4)), 5390.0)
        self.assertEqual(_parse_number(match.group(5)), 7.05)

    def test_pdf_row_repairs_wrapped_five_digit_quantity(self) -> None:
        text = (
            "6002797 / EXC 7.00 0.00\n"
            "16 8859898700279 สินค้าทดสอบ 50 G. "
            "1 13,330 0 7.05 0.00 0.00 0.00 0.00 93,976.50\n"
            ".00\n"
        )

        match = ITEM_PATTERN.search(
            normalize_wrapped_item_quantities(text),
        )

        self.assertIsNotNone(match)
        assert match is not None
        self.assertEqual(_parse_number(match.group(4)), 13330.0)
        self.assertEqual(_parse_number(match.group(5)), 7.05)

    def test_product_name_fallback_maps_to_express_code(self) -> None:
        database = ProductDatabase(product_db_path())
        item = ProductItem(
            cpall_code="6999999",
            barcode="",
            pdf_name="ยูมิยูมิ มิลค์เค้ก 55 กรัม",
            quantity=1,
            unit_price=10.30,
        )
        database.apply(item)
        self.assertEqual(item.match_status, "matched_name")
        self.assertEqual(item.express_input_code, "01000029")

    def test_saved_product_mapping_overrides_bundled_database(self) -> None:
        with TemporaryDirectory() as folder:
            catalog_path = Path(folder) / "valueplus.db"
            save_product_mapping(
                database_path=catalog_path,
                cpall_code="6999999",
                barcode="8859999999999",
                pdf_name="สินค้าใหม่สำหรับทดสอบ",
                express_code="01-0000-99",
            )

            database = ProductDatabase(
                product_db_path(),
                catalog_path,
            )
            item = ProductItem(
                cpall_code="6999999",
                barcode="8859999999999",
                pdf_name="สินค้าใหม่สำหรับทดสอบ",
                quantity=1,
                unit_price=12.34,
            )
            database.apply(item)

            self.assertEqual(item.match_status, "matched")
            self.assertEqual(item.express_code, "01-0000-99")
            self.assertEqual(item.express_input_code, "01000099")


if __name__ == "__main__":
    unittest.main()
