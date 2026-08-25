import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook

from valueplus_po.template_reader import read_template


class DynamicTemplateReaderTests(unittest.TestCase):
    def test_reads_new_products_until_moved_total_row(self):
        workbook = Workbook()
        target = workbook.active
        target.title = "ชลบุรี(1)"
        data = workbook.create_sheet("Data")

        data["E2"] = "ยูมิยูมิ มิลค์เค้ก 55กรัม"
        data["E3"] = "ยูมิยูมิ เนโกะพุดดิ้งเค้ก 50กรัม"
        target["B8"] = "ยูมิยูมิ มิลค์เค้ก 55กรัม"
        target["B27"] = "ยูมิยูมิ เนโกะพุดดิ้งเค้ก 50กรัม"
        target["A28"] = "ยอดรวมสินค้า"
        target["B31"] = "ผู้รับผิดชอบ"

        with tempfile.NamedTemporaryFile(suffix=".xlsx") as output:
            workbook.save(output.name)
            catalog = read_template(Path(output.name))

        products = catalog.sheet_products["ชลบุรี(1)"]

        self.assertEqual(
            [(product.row, product.name) for product in products],
            [
                (8, "ยูมิยูมิ มิลค์เค้ก 55กรัม"),
                (27, "ยูมิยูมิ เนโกะพุดดิ้งเค้ก 50กรัม"),
            ],
        )


if __name__ == "__main__":
    unittest.main()
