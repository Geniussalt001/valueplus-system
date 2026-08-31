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
    _write_group_workbook,
    upsert_template_product,
)

from valueplus_common import (
    normalize_wrapped_item_quantities,
)


class DailySoWorkbookTest(unittest.TestCase):
    def test_upserts_new_product_into_daily_so_template(self):
        with tempfile.TemporaryDirectory() as folder:
            template_path = Path(folder) / "Data-SO.Import.xlsx"
            workbook = Workbook()
            workbook.active.title = "Sheet1"
            data = workbook.create_sheet("data")
            data.cell(2, 5).value = "01-0000-37"
            data.cell(2, 6).value = "สินค้าเดิม"
            data.cell(3, 5).value = "09-0000-01"
            data.cell(3, 6).value = "สินค้าอื่น"
            workbook.save(template_path)

            result = upsert_template_product(
                template_path,
                "01-0000-39",
                "ยูมิยูมิ เค้กรูปอุ้งเท้าแมว 50 กรัม",
                14.09,
            )

            saved = load_workbook(template_path, data_only=False)
            try:
                self.assertTrue(result["created"])
                self.assertEqual(saved["data"].cell(3, 5).value, "01-0000-39")
                self.assertEqual(saved["data"].cell(3, 8).value, 14.09)
                self.assertEqual(saved["data"].cell(4, 5).value, "09-0000-01")
            finally:
                saved.close()

    def test_uses_saved_mapping_for_a_new_pdf_product_name(self):
        product = TemplateProduct(
            item_code="01-0000-39",
            item_name="ยูมิยูมิ เค้กรูปอุ้งเท้าแมว 50 กรัม",
            price=14.09,
            row_number=2,
            normalized_name="เค้กรูปอุ้งเท้าแมว",
        )
        item = PdfItem(
            barcode="8850000000039",
            pdf_name="เนโกะพุดดิ้งเค้ก UM 50 G.",
            quantity=10,
            price=14.09,
            page_number=1,
        )

        result = _build_preview(
            pdf_path=Path("input.pdf"),
            template_path=Path("template.xlsx"),
            documents=[
                PdfDocument(
                    po_number="B012600039",
                    document_date="25/08/2026",
                    warehouse="สำโรง",
                    items=[item],
                ),
            ],
            template_products=[product],
            warehouse_overrides={},
            product_overrides={
                "name:เนโกะพุดดิ้งเค้ก UM 50 G.": "01-0000-39",
            },
        )

        record = result["groups"][0]["records"][0]

        self.assertEqual(record["item_code"], "01-0000-39")
        self.assertEqual(record["match_score"], 1.0)
        self.assertEqual(record["match_method"], "saved_mapping")
        self.assertEqual(result["error_count"], 0)
        self.assertEqual(
            result["product_options"],
            [
                {
                    "item_code": "01-0000-39",
                    "item_name": "ยูมิยูมิ เค้กรูปอุ้งเท้าแมว 50 กรัม",
                    "price": 14.09,
                },
            ],
        )

    def test_reads_large_quantities_wrapped_by_cpall_pdf(self):
        cases = [
            ("13,330", ".00", 13330.0),
            ("5,440.", "00", 5440.0),
            ("125,000", ".00", 125000.0),
        ]

        for quantity, decimal_line, expected in cases:
            with self.subTest(quantity=quantity):
                text = (
                    "2 8859898700415 สินค้าทดสอบ UM 70 G. "
                    f"1 {quantity} 0 13.55 0.00\n"
                    f"                         {decimal_line}"
                )
                normalized = normalize_wrapped_item_quantities(text)
                match = ITEM_PATTERN.search(normalized)

                self.assertIsNotNone(match)
                self.assertEqual(
                    float(match.group(4).replace(",", "")),
                    expected,
                )

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
