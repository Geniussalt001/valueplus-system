from valueplus_po.models import PdfItem
from valueplus_po.normalizers import normalize_product_name
from valueplus_po.product_matcher import match_products
from valueplus_po.template_reader import TemplateCatalog, TemplateProduct


def test_product_code_alias_uses_edited_canonical_name() -> None:
    canonical_name = "ยูมิยูมิ เนโกะพุดดิ้งเค้ก 50กรัม"
    canonical = TemplateProduct(
        name=canonical_name,
        normalized_name=normalize_product_name(canonical_name),
        row=2,
        product_code="8850001",
    )
    target = TemplateProduct(
        name=canonical_name,
        normalized_name=normalize_product_name(canonical_name),
        row=28,
    )
    catalog = TemplateCatalog(
        sheet_names={"Data", "สำโรง(1)"},
        data_products=[canonical],
        sheet_products={"สำโรง(1)": [target]},
    )
    item = PdfItem(
        line_number=1,
        barcode="8850001",
        pdf_name="ชื่อใน PDF ที่อ่านคลาดเคลื่อน",
        quantity=24,
        page_number=1,
    )

    matches = match_products([item], "สำโรง(1)", catalog)

    assert len(matches) == 1
    assert matches[0].matched is True
    assert matches[0].target_name == canonical_name
    assert matches[0].excel_row == 28

