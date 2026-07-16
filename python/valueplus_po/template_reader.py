from dataclasses import dataclass
from pathlib import Path

from openpyxl import load_workbook

from .constants import PRODUCT_FIRST_ROW, PRODUCT_LAST_ROW
from .normalizers import normalize_product_name


@dataclass(frozen=True)
class TemplateProduct:
    name: str
    normalized_name: str
    row: int


@dataclass
class TemplateCatalog:
    sheet_names: set[str]
    data_products: list[TemplateProduct]
    sheet_products: dict[str, list[TemplateProduct]]


class TemplateReadError(ValueError):
    pass


def read_template(template_path: str | Path) -> TemplateCatalog:
    path = Path(template_path)
    if not path.is_file():
        raise TemplateReadError(f"ไม่พบไฟล์ Excel Template: {path}")

    workbook = load_workbook(path, read_only=True, data_only=False)
    try:
        if "Data" not in workbook.sheetnames:
            raise TemplateReadError("ไม่พบชีต Data ใน Excel Template")

        data_sheet = workbook["Data"]
        data_products = []
        for row in range(2, data_sheet.max_row + 1):
            name = data_sheet.cell(row=row, column=5).value
            if not name:
                continue
            name = str(name).strip()
            data_products.append(
                TemplateProduct(
                    name=name,
                    normalized_name=normalize_product_name(name),
                    row=row,
                ),
            )

        sheet_products: dict[str, list[TemplateProduct]] = {}
        for sheet_name in workbook.sheetnames:
            if sheet_name == "Data":
                continue
            sheet = workbook[sheet_name]
            products = []
            for row in range(PRODUCT_FIRST_ROW, PRODUCT_LAST_ROW + 1):
                name = sheet.cell(row=row, column=2).value
                if not name:
                    continue
                name = str(name).strip()
                products.append(
                    TemplateProduct(
                        name=name,
                        normalized_name=normalize_product_name(name),
                        row=row,
                    ),
                )
            sheet_products[sheet_name] = products

        return TemplateCatalog(
            sheet_names=set(workbook.sheetnames),
            data_products=data_products,
            sheet_products=sheet_products,
        )
    finally:
        workbook.close()

