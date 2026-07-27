from __future__ import annotations

import json
import re
from difflib import SequenceMatcher
from pathlib import Path

from .models import ProductItem


class ProductDatabase:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.products = self._load()

    def _load(self) -> dict[str, dict[str, str]]:
        payload = json.loads(self.path.read_text(encoding="utf-8"))
        return {
            str(product["cpall_code"]): product
            for product in payload["products"]
        }

    @staticmethod
    def _normalize_name(value: str) -> str:
        text = str(value or "").lower()
        text = text.replace("กรัม", "g")
        text = re.sub(r"\b(?:um|u\.m\.|g\.)\b", "g", text)
        text = re.sub(r"[^0-9a-z\u0e00-\u0e7f]+", "", text)
        return text

    def _match_by_name(self, pdf_name: str) -> tuple[dict | None, float]:
        target = self._normalize_name(pdf_name)
        if not target:
            return None, 0.0

        ranked: list[tuple[float, dict]] = []
        for product in self.products.values():
            product_name = self._normalize_name(product.get("pdf_name", ""))
            keyword = self._normalize_name(product.get("keyword", ""))
            score = SequenceMatcher(None, target, product_name).ratio()
            if keyword and (keyword in target or target in keyword):
                score = max(score, 0.96)
            ranked.append((score, product))

        ranked.sort(key=lambda row: row[0], reverse=True)
        if not ranked:
            return None, 0.0
        best_score, best_product = ranked[0]
        second_score = ranked[1][0] if len(ranked) > 1 else 0.0

        # ต้องคล้ายมากพอ และต้องชนะอันดับสองชัดเจน เพื่อลดการจับผิดสินค้า
        if best_score < 0.72 or best_score - second_score < 0.06:
            return None, best_score
        return best_product, best_score

    def apply(self, item: ProductItem) -> None:
        item.express_code = ""
        item.express_input_code = ""
        item.match_method = ""
        item.match_score = 0.0
        product = self.products.get(item.cpall_code)
        if not product:
            product, score = self._match_by_name(item.pdf_name)
            if not product:
                item.match_status = "unmatched"
                item.match_score = round(score, 4)
                return
            item.match_status = "matched_name"
            item.match_method = "fuzzy_name"
            item.match_score = round(score, 4)
        else:
            item.match_status = "matched"
            item.match_method = "cpall_code"
            item.match_score = 1.0

        item.express_code = product["express_code"]
        item.express_input_code = product["express_code"].replace("-", "")
