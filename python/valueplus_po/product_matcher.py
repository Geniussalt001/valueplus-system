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
    for product in catalog.data_products:
        data_by_key[product.normalized_name].append(product)

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
        data_candidates = data_by_key.get(key, [])
        target_candidates = target_by_key.get(key, [])

        if not data_candidates:
            results.append(
                ProductMatch(
                    barcode=barcode,
                    pdf_name=first_item.pdf_name,
                    data_name=None,
                    target_name=None,
                    excel_row=None,
                    quantity=group["quantity"],
                    matched=False,
                    message="ไม่พบสินค้าในชีต Data",
                ),
            )
            continue

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
                    data_name=data_candidates[0].name,
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
                if normalize_product_name(product.name) == target.normalized_name
            ),
            data_candidates[0],
        )

        results.append(
            ProductMatch(
                barcode=barcode,
                pdf_name=first_item.pdf_name,
                data_name=matching_data.name,
                target_name=target.name,
                excel_row=target.row,
                quantity=group["quantity"],
                matched=True,
            ),
        )

    return sorted(results, key=lambda item: item.excel_row or 999)

