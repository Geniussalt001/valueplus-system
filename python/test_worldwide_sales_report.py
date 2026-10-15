import tempfile
import unittest
from pathlib import Path

from openpyxl import load_workbook

from worldwide_sales_report_cli import DATA_SHEET, SUMMARY_SHEET, update_workbook


class WorldwideSalesReportTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.output = Path(self.temp_dir.name) / "รายงานยอดขาย" / "ตุลาคม 2569" / "รายงานยอดขาย ตุลาคม 2569.xlsx"

    def tearDown(self):
        self.temp_dir.cleanup()

    def payload(self, sale_id, cartons=3):
        return {
            "saleId": sale_id,
            "part": "retail",
            "date": "2026-10-15",
            "store": {"name": "ร้านทดสอบ", "province": "เชียงใหม่"},
            "items": [
                {"name": "สินค้า A", "weightGrams": 55, "cartons": cartons},
                {"name": "สินค้า B", "weightGrams": 70, "cartons": 2},
            ],
            "createdAt": "2026-10-15T09:00:00Z",
        }

    def test_creates_monthly_workbook_with_two_sheets_and_charts(self):
        result = update_workbook(self.payload("SAL-001"), self.output)

        self.assertTrue(self.output.exists())
        self.assertEqual(result["totalCartons"], 5)
        workbook = load_workbook(self.output, data_only=False)
        self.assertEqual(workbook.sheetnames, [DATA_SHEET, SUMMARY_SHEET])
        self.assertEqual(
            [cell.value for cell in workbook[DATA_SHEET][1]],
            ["รหัสรายการ", "วันที่", "บริษัท", "ร้านค้า", "จังหวัด", "สินค้า", "น้ำหนัก (กรัม)", "จำนวน (ลัง)", "บันทึกเมื่อ"],
        )
        self.assertEqual(workbook[DATA_SHEET].max_row, 3)
        self.assertEqual(len(workbook[SUMMARY_SHEET]._charts), 2)
        self.assertEqual(len(workbook[SUMMARY_SHEET].data_validations.dataValidation), 2)
        self.assertEqual(workbook[SUMMARY_SHEET]["M32"].value.day, 31)

    def test_updates_same_sale_without_duplicate_rows(self):
        update_workbook(self.payload("SAL-001"), self.output)
        update_workbook(self.payload("SAL-001", cartons=8), self.output)

        workbook = load_workbook(self.output, data_only=False)
        sheet = workbook[DATA_SHEET]
        self.assertEqual(sheet.max_row, 3)
        self.assertEqual(sheet["H2"].value, 8)

    def test_appends_a_different_sale(self):
        update_workbook(self.payload("SAL-001"), self.output)
        update_workbook(self.payload("SAL-002", cartons=4), self.output)

        workbook = load_workbook(self.output, data_only=False)
        self.assertEqual(workbook[DATA_SHEET].max_row, 5)


if __name__ == "__main__":
    unittest.main()
