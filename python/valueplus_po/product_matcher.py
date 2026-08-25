from collections import defaultdict

from .models import PdfItem, ProductMatch
from .normalizers import normalize_product_name
from .template_reader import TemplateCatalog


def match_products(
    items: list[PdfItem],
    target_sheet: str,
    catalog: TemplateCatalog,
) -> list[ProductMatch]:
    data_by_key = defaultdict(list)
    data_by_code = defaultdict(list)

    for product in catalog.data_products:
        data_by_key[product.normalized_name].append(product)

        if product.product_code:
            data_by_code[
                normalize_product_code(
                    product.product_code,
                )
            ].append(product)

    target_by_key = defaultdict(list)
    for product in catalog.sheet_products.get(target_sheet, []):
        target_by_key[product.normalized_name].append(product)

    aggregated = defaultdict(lambda: {"quantity": 0.0, "items": []})
    for item in items:
        key = normalize_product_name(item.pdf_name)
        aggregated[(key, item.barcode)]["quantity"] += item.quantity
        aggregated[(key, item.barcode)]["items"].append(item)

    results = []
    for (key, barcode), group in aggregated.items():
        first_item = group["items"][0]
        code_candidates = data_by_code.get(
            normalize_product_code(
                barcode,
            ),
            [],
        )

        if len(code_candidates) > 1:
            results.append(
                ProductMatch(
                    barcode=barcode,
                    pdf_name=first_item.pdf_name,
                    data_name=None,
                    target_name=None,
                    excel_row=None,
                    quantity=group["quantity"],
                    matched=False,
                    message="พบรหัสสินค้าซ้ำในชีต Data",
                ),
            )
            continue

        data_candidates = (
            code_candidates
            if code_candidates
            else data_by_key.get(
                key,
                [],
            )
        )

        target_key = (
            code_candidates[0]
            .normalized_name
            if code_candidates
            else key
        )

        target_candidates = target_by_key.get(
            target_key,
            [],
        )

        # The destination warehouse sheet is the workbook write target and is
        # therefore authoritative. A unique exact normalized-name match is
        # safe even when a newly-added product has not been duplicated in Data.
        if len(target_candidates) != 1:
            message = (
                "ไม่พบสินค้าในชีตปลายทาง"
                if not target_candidates
                else "พบสินค้าซ้ำในชีตปลายทาง"
            )
            results.append(
                ProductMatch(
                    barcode=barcode,
                    pdf_name=first_item.pdf_name,
                    data_name=(
                        data_candidates[0].name
                        if data_candidates
                        else None
                    ),
                    target_name=None,
                    excel_row=None,
                    quantity=group["quantity"],
                    matched=False,
                    message=message,
                ),
            )
            continue

        target = target_candidates[0]
        matching_data = next(
            (
                product
                for product in data_candidates
                if product.normalized_name == target.normalized_name
            ),
            None,
        )

        results.append(
            ProductMatch(
                barcode=barcode,
                pdf_name=first_item.pdf_name,
                data_name=(
                    matching_data.name
                    if matching_data
                    else target.name
                ),
                target_name=target.name,
                excel_row=target.row,
                quantity=group["quantity"],
                matched=True,
            ),
        )

    return sorted(results, key=lambda item: item.excel_row or 999)



def normalize_product_code(
    value: str,
) -> str:
    return "".join(
        str(value or "")
        .strip()
        .upper()
        .split()
    )
