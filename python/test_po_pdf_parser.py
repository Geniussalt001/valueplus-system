import unittest

from valueplus_po.pdf_parser import (
    ITEM_PATTERN,
    _normalize_wrapped_decimal_values,
)


class PoPdfParserTest(unittest.TestCase):
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
            "1 8859898700316 สินค้าทดสอบ 1 10,000.    0 8.13\n"
            "                                  00\n"
        )

        normalized = _normalize_wrapped_decimal_values(text)
        match = ITEM_PATTERN.search(normalized)

        self.assertIsNotNone(match)
        assert match is not None
        self.assertEqual(
            float(match.group(4).replace(",", "")),
            10000.0,
        )

    def test_keeps_complete_quantity_unchanged(self):
        text = "1 8859898700316 สินค้าทดสอบ 1 1,200.00 0 8.13\n"

        self.assertEqual(
            _normalize_wrapped_decimal_values(text),
            text.rstrip("\n"),
        )


if __name__ == "__main__":
    unittest.main()
