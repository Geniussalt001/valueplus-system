import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook

from do_branch_master_cli import build_result


class DoBranchMasterTest(unittest.TestCase):
    def test_reads_and_deduplicates_master(self):
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "ข้อมูลทั้งหมด"
        sheet.append(["รหัสสาขา", "ชื่อสาขา", "จังหวัด", "ภาค"])
        sheet.append([6433, "FR.ลี้", "ลำพูน", "เหนือ"])
        sheet.append(["06433", "FR.ลี้", "ลำพูน", "เหนือ"])
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "master.xlsx"
            workbook.save(path)
            result = build_result(path)
        self.assertEqual(result["branch_count"], 1)
        self.assertEqual(result["duplicate_count"], 1)
        self.assertEqual(result["records"][0]["branch_code"], "06433")


if __name__ == "__main__":
    unittest.main()
