import unittest

from valueplus_po.pdf_parser import (
    COMPACT_ITEM_PATTERN,
    ITEM_PATTERN,
    _normalize_wrapped_decimal_values,
)
from valueplus_po.pdf_splitter import _count_item_rows
from valueplus_common import (
    normalize_cpall_document_date,
    normalize_cpall_pdf_text,
)


class PoPdfParserTest(unittest.TestCase):
    def test_normalizes_reporting_services_cid_marks_and_short_year(self):
        text = (
            "เลขที(cid:1143) : B012801884 "
            "วันที(cid:1143) : 24/08/69 "
            "น(cid:1148)าส(cid:1173)ง : WB01 คลัง BDC โชคชัย คลังดี"
        )

        normalized = normalize_cpall_pdf_text(text)

        self.assertIn("เลขที่ : B012801884", normalized)
        self.assertIn("วันที่ : 24/08/69", normalized)
        self.assertIn("นำส่ง : WB01", normalized)
        self.assertEqual(
            normalize_cpall_document_date("24/08/69"),
            "24/08/2569",
        )

    def test_reads_compact_item_without_barcode(self):
        text = (
            "1 6002424 Hมิลค์เค้กUM 55 G. "
            "1 130.00 0 10.30 0.00 0.00 0.00 0.00 1,339.00"
        )

        match = COMPACT_ITEM_PATTERN.search(text)

        self.assertIsNotNone(match)
        assert match is not None
        self.assertEqual(match.group(2), "6002424")
        self.assertEqual(match.group(3), "Hมิลค์เค้กUM 55 G.")
        self.assertEqual(float(match.group(4)), 130.0)
        self.assertEqual(_count_item_rows(text), 1)

    def test_joins_wrapped_thousands_quantity(self):
        text = (
            "17 8859898700316 สินค้าทดสอบ 1 1,002.    0 8.13\n"
            "                                  00\n"
        )

        normalized = _normalize_wrapped_decimal_values(text)
        match = ITEM_PATTERN.search(normalized)

        self.assertIsNotNone(match)
        assert match is not None
        self.assertEqual(match.group(4), "1,002.00")

    def test_joins_five_digit_wrapped_quantity(self):
        text = (
            "1 8859898700316 สินค้าทดสอบ 1 10,000 0 8.13\n"
            "                                  .00\n"
        )

        normalized = _normalize_wrapped_decimal_values(text)
        match = ITEM_PATTERN.search(normalized)

        self.assertIsNotNone(match)
        assert match is not None
        self.assertEqual(
            float(match.group(4).replace(",", "")),
            10000.0,
        )

    def test_does_not_join_unrelated_wrapped_decimal(self):
        text = "ยอดรวม 10,000.\n00\n"

        self.assertEqual(
            _normalize_wrapped_decimal_values(text),
            text.rstrip("\n"),
        )

    def test_keeps_complete_quantity_unchanged(self):
        text = "1 8859898700316 สินค้าทดสอบ 1 1,200.00 0 8.13\n"

        self.assertEqual(
            _normalize_wrapped_decimal_values(text),
            text.rstrip("\n"),
        )


if __name__ == "__main__":
    unittest.main()
