import tempfile
import unittest

from pathlib import Path

from openpyxl import Workbook, load_workbook

from valueplus_so.so_processor import (
    ITEM_PATTERN,
    PdfDocument,
    PdfItem,
    TemplateProduct,
    _build_preview,
    _match_product,
    _parse_number,
    _write_group_workbook,
)


class DailySoWorkbookTest(unittest.TestCase):
    def test_reads_large_quantity_when_decimal_wraps_to_next_line(self):
        text = (
            "  2  8859898700415  Hชิสึเค้กรสชาอู่หลงUM 70.00 G. "
            "1 10,890\n       .00  0 13.55 0.00"
        )

        match = ITEM_PATTERN.search(text)

        self.assertIsNotNone(match)
        self.assertEqual(match.group(2), "8859898700415")
        self.assertEqual(_parse_number(match.group(4)), 10890)

    def test_maps_oolong_cheesecake_to_new_template_product(self):
        product = TemplateProduct(
            item_code="01-0000-38",
            item_name="ยูมิยูมิ ชีสเค้ก (ขนมเค้กรสชาอู่หลง) 70 กรัม",
            price=13.55,
            row_number=45,
            normalized_name="ยูมิยูมิชีสเค้กขนมเค้กรสชาอู่หลง70กรัม",
        )
        item = PdfItem(
            barcode="8859898700415",
            pdf_name="Hชิสึเค้กรสชาอู่หลงUM 70.00 G.",
            quantity=10890,
            price=13.55,
            page_number=1,
        )

        matched, score, method = _match_product(
            item,
            [product],
            {product.item_code: product},
        )

        self.assertIs(matched, product)
        self.assertEqual(score, 1.0)
        self.assertEqual(method, "barcode")

    def test_moves_warehouse_from_q19_to_q20_before_aggregation(self):
        products = [
            TemplateProduct(
                item_code="01-0000-29",
                item_name="สินค้าทดสอบ",
                price=10.3,
                row_number=2,
                normalized_name="สินค้าทดสอบ",
            ),
        ]
        documents = [
            PdfDocument(
                po_number="B012600001",
                document_date="31/07/2026",
                warehouse="เชียงใหม่",
                items=[
                    PdfItem(
                        barcode="8859898700156",
                        pdf_name="สินค้าทดสอบ",
                        quantity=1200,
                        price=10.3,
                        page_number=1,
                    ),
                ],
            ),
            PdfDocument(
                po_number="B012600002",
                document_date="31/07/2026",
                warehouse="หาดใหญ่",
                items=[
                    PdfItem(
                        barcode="8859898700156",
                        pdf_name="สินค้าทดสอบ",
                        quantity=10,
                        price=10.3,
                        page_number=2,
                    ),
                ],
            ),
        ]

        result = _build_preview(
            pdf_path=Path("input.pdf"),
            template_path=Path("template.xlsx"),
            documents=documents,
            template_products=products,
            warehouse_overrides={"เชียงใหม่": "Q20"},
        )

        q19, q20 = result["groups"]

        self.assertEqual(q19["po_count"], 0)
        self.assertEqual(q19["warehouses"], [])
        self.assertEqual(q19["so_text"], "Q19 รวม 0 PO 31/7/26")
        self.assertEqual(q20["po_count"], 2)
        self.assertEqual(q20["warehouses"], ["เชียงใหม่", "หาดใหญ่"])
        self.assertEqual(q20["total_quantity"], 1210)
        self.assertEqual(q20["so_text"], "Q20 รวม 2 PO 31/7/26")

    def test_writes_group_code_as_so_number(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            template_path = root / "template.xlsx"
            output_path = root / "output.xlsx"

            workbook = Workbook()
            sheet = workbook.active
            sheet.title = "Sheet1"
            sheet.append([
                "SONumber",
                "DueDate",
                "CustomerCode",
                "SupplierName",
                "ItemCode",
                "ItemName",
                "Qty",
                "Price",
                "Status",
            ])
            sheet.append([
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
            ])
            workbook.create_sheet("data")
            workbook.save(template_path)

            _write_group_workbook(
                template_path=template_path,
                output_path=output_path,
                document_date="31/07/2026",
                group={
                    "code": "Q19",
                    "po_text": "รวม 12 PO",
                    "so_text": (
                        "Q19 รวม 12 PO 31/7/26"
                    ),
                    "po_count": 12,
                    "records": [
                        {
                            "item_code": "01-0000-29",
                            "quantity": 10,
                            "price": 10.3,
                        },
                    ],
                },
            )

            result = load_workbook(
                output_path,
                data_only=False,
            )

            try:
                self.assertEqual(
                    result["Sheet1"]["A2"].value,
                    "Q19 รวม 12 PO 31/7/26",
                )
            finally:
                result.close()


if __name__ == "__main__":
    unittest.main()
