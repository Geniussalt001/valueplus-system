import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from valueplus_po.normalizers import normalize_product_name
from valueplus_po.pdf_parser import parse_pdf


class FakePage:
    def __init__(self, text):
        self.text = text

    def extract_text(self, layout=False):
        return self.text


class FakePdf:
    def __init__(self, pages):
        self.pages = [FakePage(text) for text in pages]

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


class PdfParserFormatTests(unittest.TestCase):
    def parse_text(self, text):
        with tempfile.NamedTemporaryFile(suffix=".pdf") as source:
            with patch(
                "valueplus_po.pdf_parser.pdfplumber.open",
                return_value=FakePdf([text]),
            ):
                return parse_pdf(Path(source.name))

    def test_original_barcode_format_remains_supported(self):
        documents = self.parse_text(
            "เลขที่ : B012801967\n"
            "วันที่ : 25/08/2569\n"
            "คลัง BDC โชคชัย คลังดี\n"
            "1 8859898700156 Hมิลค์เค้กUM 55 G. "
            "1 139.00 0 10.30 0.00\n",
        )

        self.assertEqual(len(documents), 1)
        self.assertEqual(documents[0].po_number, "B012801967")
        self.assertEqual(documents[0].document_date, "25/08/2569")
        self.assertEqual(documents[0].warehouse, "โชคชัย")
        self.assertEqual(documents[0].items[0].barcode, "8859898700156")
        self.assertEqual(documents[0].items[0].quantity, 139)

    def test_report_po_cid_and_product_code_format_is_supported(self):
        documents = self.parse_text(
            "เลขที(cid:1143) : B012801884\n"
            "วันที(cid:1143) : 25/08/69\n"
            "น(cid:1148)าส(cid:1173)ง : WB01 คลัง BDC ส(cid:1148)าโรง คลังดี\n"
            "1 6002510 Hเค(cid:1174)กอัลมอนดU(cid:1177) M 75.00 G. "
            "1 80.00 0 15.72 0.00\n",
        )

        self.assertEqual(len(documents), 1)
        self.assertEqual(documents[0].po_number, "B012801884")
        self.assertEqual(documents[0].document_date, "25/08/2569")
        self.assertEqual(documents[0].warehouse, "สำโรง")
        self.assertEqual(documents[0].items[0].barcode, "6002510")
        self.assertEqual(documents[0].items[0].quantity, 80)
        self.assertEqual(
            normalize_product_name(documents[0].items[0].pdf_name),
            normalize_product_name("Hเค้กอัลมอนด์UM 75.00 G."),
        )


if __name__ == "__main__":
    unittest.main()
