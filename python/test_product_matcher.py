import unittest

from valueplus_po.models import PdfItem
from valueplus_po.normalizers import normalize_product_name
from valueplus_po.product_matcher import match_products
from valueplus_po.template_reader import TemplateCatalog, TemplateProduct


class ProductMatcherTests(unittest.TestCase):
    def setUp(self):
        self.target_name = "ยูมิยูมิ เนโกะพุดดิ้งเค้ก 50กรัม"
        self.target = TemplateProduct(
            name=self.target_name,
            normalized_name=normalize_product_name(self.target_name),
            row=26,
        )
        self.item = PdfItem(
            line_number=19,
            barcode="8859898700439",
            pdf_name="Hเนโกะพุดดิ้งเค้กUM 50 G.",
            quantity=10860,
            page_number=1,
        )

    def test_unique_target_matches_without_data_entry(self):
        catalog = TemplateCatalog(
            sheet_names={"Data", "ชลบุรี(1)"},
            data_products=[],
            sheet_products={"ชลบุรี(1)": [self.target]},
        )

        result = match_products(
            [self.item],
            "ชลบุรี(1)",
            catalog,
        )

        self.assertEqual(len(result), 1)
        self.assertTrue(result[0].matched)
        self.assertEqual(result[0].excel_row, 26)
        self.assertEqual(result[0].quantity, 10860)
        self.assertEqual(result[0].data_name, self.target_name)

    def test_missing_target_still_requires_review(self):
        catalog = TemplateCatalog(
            sheet_names={"Data", "ชลบุรี(1)"},
            data_products=[],
            sheet_products={"ชลบุรี(1)": []},
        )

        result = match_products(
            [self.item],
            "ชลบุรี(1)",
            catalog,
        )

        self.assertFalse(result[0].matched)
        self.assertEqual(
            result[0].message,
            "ไม่พบสินค้าในชีตปลายทาง",
        )


if __name__ == "__main__":
    unittest.main()
