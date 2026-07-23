import type {
  PoPreviewRecord,
  PoProductMatch,
  PoQuantityOverrides,
} from "../types/poProcessor.types";

export function poQuantityOverrideKey(
  record: PoPreviewRecord,
  item: PoProductMatch,
): string {
  return [
    record.target_sheet,
    item.excel_row ?? "",
    item.barcode,
  ].join("|");
}

export function getEffectivePoQuantity(
  record: PoPreviewRecord,
  item: PoProductMatch,
  overrides: PoQuantityOverrides,
): number {
  const key =
    poQuantityOverrideKey(
      record,
      item,
    );

  const override =
    overrides[key];

  return typeof override ===
    "number"
    ? override
    : item.quantity;
}

export function getOriginalPoQuantity(
  item: PoProductMatch,
): number {
  return item.original_quantity ??
    item.quantity;
}
