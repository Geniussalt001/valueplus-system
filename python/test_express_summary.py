from __future__ import annotations

import csv
import tempfile
import unittest
from pathlib import Path

from valueplus_summary.express_parser import parse_express_csv


class ExpressSummaryGiftTest(unittest.TestCase):
    def test_separates_paid_and_free_gift_rows_for_same_product(self) -> None:
        rows = []

        warehouse_row = [""] * 14
        warehouse_row[1] = "เขตการขาย:"
        warehouse_row[2] = "มหาชัย 1"
        rows.append(warehouse_row)

        invoice_row = [""] * 14
        invoice_row[6] = "IVVPR6907001"
        invoice_row[7] = "05/11/2569"
        rows.append(invoice_row)

        paid_row = [""] * 14
        paid_row[9] = "01-0000-37"
        paid_row[10] = "ยูมิยูมิ เค้กรูปอุ้งเท้าแมว 50 กรัม"
        paid_row[11] = "57"
        paid_row[13] = "10.00"
        rows.append(paid_row)

        gift_row = [""] * 14
        gift_row[9] = "01-0000-37"
        gift_row[10] = "ยูมิยูมิ เค้กรูปอุ้งเท้าแมว 50 กรัม"
        gift_row[11] = "57"
        gift_row[13] = "0.00"
        rows.append(gift_row)
        rows.append([""] * 14)

        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "express.csv"
            with path.open("w", encoding="utf-8-sig", newline="") as output:
                csv.writer(output).writerows(rows)

            result = parse_express_csv(path)

        self.assertEqual(result["item_line_count"], 2)
        self.assertEqual(result["product_count"], 2)
        self.assertEqual(result["total_quantity"], 114)
        self.assertEqual(
            [(item["quantity"], item["is_free_gift"]) for item in result["products"]],
            [(57, False), (57, True)],
        )
        self.assertFalse(result["invoices"][0]["items"][0]["is_free_gift"])
        self.assertTrue(result["invoices"][0]["items"][1]["is_free_gift"])


if __name__ == "__main__":
    unittest.main()
