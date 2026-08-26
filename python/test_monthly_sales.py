import csv
import tempfile
import unittest
from pathlib import Path

from monthly_sales_cli import build_result


class MonthlySalesTest(unittest.TestCase):
    def test_parses_sales_and_credit_notes_from_express_csv(self):
        rows = [
            ["", "ลูกค้า", "รหัสลูกค้า", "สินค้า", "รหัสสินค้า", "วันที่", "เลขที่เอกสาร", "จำนวน"],
            ["", "", "", "มิลค์เค้ก", "01-0000-29"],
            ["", "", "", "", "", "01/05/2569", "IVVPR6905001- 1", "100"],
            ["", "", "", "", "", "02/05/2569", "SR6905001- 1", "3"],
        ]
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "sample.csv"
            with path.open("w", encoding="utf-8-sig", newline="") as stream:
                csv.writer(stream).writerows(rows)
            result = build_result([str(path)])

        self.assertEqual(result["sales_total"], 100)
        self.assertEqual(result["cn_total"], 3)
        self.assertEqual(result["net_total"], 97)
        self.assertEqual(result["transaction_count"], 2)
        self.assertEqual(result["months"][0]["month_name"], "พฤษภาคม")
        self.assertEqual(len(result["summary_records"]), 2)
        self.assertEqual(
            {record["type"] for record in result["summary_records"]},
            {"ขาย", "CN"},
        )

    def test_unmapped_product_is_reported_but_not_calculated(self):
        rows = [
            ["", "", "", "สินค้าเก่า", "99-0000-99"],
            ["", "", "", "", "", "01/05/2569", "IVTEST", "10"],
            ["", "", "", "มิลค์เค้ก", "01-0000-29"],
            ["", "", "", "", "", "01/05/2569", "IVVPR6905001", "5"],
        ]
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "sample.csv"
            with path.open("w", encoding="utf-8-sig", newline="") as stream:
                csv.writer(stream).writerows(rows)
            result = build_result([str(path)])

        self.assertEqual(result["sales_total"], 5)
        self.assertEqual(result["excluded_count"], 1)

    def test_ip_documents_are_not_counted_as_sales(self):
        rows = [
            ["", "", "", "มิลค์เค้ก", "01-0000-29"],
            ["", "", "", "", "", "01/05/2569", "IVVPR6905001", "5"],
            ["", "", "", "", "", "01/05/2569", "IPVPR6905002", "100"],
        ]
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "sample.csv"
            with path.open("w", encoding="utf-8-sig", newline="") as stream:
                csv.writer(stream).writerows(rows)
            result = build_result([str(path)])

        self.assertEqual(result["sales_total"], 5)
        self.assertEqual(result["transaction_count"], 1)


if __name__ == "__main__":
    unittest.main()
