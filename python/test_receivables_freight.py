import csv
import tempfile
import unittest
from pathlib import Path

from receivables_freight_cli import (
    normalize_gregorian_date,
    parse_credit_note_records,
)


def make_row():
    return [""] * 16


class CreditNoteParserTest(unittest.TestCase):
    def test_maps_credit_note_columns_and_strips_applied_iv_prefix(self):
        rows = []

        customer_row = make_row()
        customer_row[1] = "ซีพี ออลล์ จำกัด (มหาชน)"
        rows.append(customer_row)

        first_credit_note = make_row()
        first_credit_note[5] = "SR6907001"
        first_credit_note[6] = "01/07/2569"
        first_credit_note[8] = "IVVPR6907001"
        first_credit_note[13] = "86.46"
        rows.append(first_credit_note)

        first_detail = make_row()
        first_detail[14] = "IVVPR6907001- 19"
        rows.append(first_detail)

        second_credit_note = make_row()
        second_credit_note[5] = "SR6907002"
        second_credit_note[6] = "02/07/2569"
        second_credit_note[8] = "IV0000000"
        second_credit_note[13] = "100.00"
        rows.append(second_credit_note)

        with tempfile.TemporaryDirectory() as directory:
            csv_path = Path(directory) / "credit-notes.csv"
            with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
                csv.writer(handle).writerows(rows)

            result = parse_credit_note_records(csv_path, "template")

        self.assertEqual(result["record_count"], 2)
        self.assertEqual(result["total_amount"], 186.46)
        self.assertEqual(result["review_count"], 0)
        self.assertEqual(result["error_count"], 0)

        first = result["records"][0]
        self.assertEqual(first["date"], "01/07/2026")
        self.assertEqual(first["credit_note_number"], "SR6907001")
        self.assertEqual(
            first["customer"],
            "บริษัท ซีพี ออลล์ จำกัด(มหาชน)สำนักงานใหญ่",
        )
        self.assertEqual(first["amount"], 86.46)
        self.assertEqual(first["reference_invoice"], "VPR6907001")
        self.assertEqual(first["applied_invoice"], "VPR6907001")

        second = result["records"][1]
        self.assertEqual(second["reference_invoice"], "IV0000000")
        self.assertEqual(second["date"], "02/07/2026")
        self.assertEqual(second["applied_invoice"], "IV0000000")
        self.assertEqual(second["status"], "ready")

    def test_normalizes_buddhist_and_gregorian_years(self):
        self.assertEqual(
            normalize_gregorian_date("24/08/2569"),
            "24/08/2026",
        )
        self.assertEqual(
            normalize_gregorian_date("24/08/2026"),
            "24/08/2026",
        )
        with self.assertRaises(ValueError):
            normalize_gregorian_date("31/02/2569")


if __name__ == "__main__":
    unittest.main()
