import {
  Ban,
  Check,
  PencilLine,
  RotateCcw,
  X,
} from "lucide-react";

import type {
  PoPreviewRecord,
  PoQuantityOverrides,
} from "../../types/poProcessor.types";

import {
  getEffectivePoQuantity,
  getOriginalPoQuantity,
  poQuantityOverrideKey,
} from "../../utils/poQuantity";

interface PickingAdjustmentModalProps {
  open: boolean;
  records: PoPreviewRecord[];
  overrides: PoQuantityOverrides;
  disabled: boolean;
  onClose: () => void;
  onChange: (
    key: string,
    value: number,
  ) => void;
  onRestore: (
    key: string,
  ) => void;
  onResetAll: () => void;
  onConfirm: () => void;
}

export function PickingAdjustmentModal({
  open,
  records,
  overrides,
  disabled,
  onClose,
  onChange,
  onRestore,
  onResetAll,
  onConfirm,
}: PickingAdjustmentModalProps) {
  if (!open) {
    return null;
  }

  const adjustableItems =
    records.flatMap(
      (record) =>
        record.items
          .filter(
            (item) =>
              item.matched &&
              item.excel_row !==
                null,
          )
          .map(
            (item) => ({
              record,
              item,
            }),
          ),
    );

  const originalTotal =
    adjustableItems.reduce(
      (total, entry) =>
        total +
        getOriginalPoQuantity(
          entry.item,
        ),
      0,
    );

  const adjustedTotal =
    adjustableItems.reduce(
      (total, entry) =>
        total +
        getEffectivePoQuantity(
          entry.record,
          entry.item,
          overrides,
        ),
      0,
    );

  const excludedCount =
    adjustableItems.filter(
      (entry) =>
        getEffectivePoQuantity(
          entry.record,
          entry.item,
          overrides,
        ) === 0,
    ).length;

  return (
    <div
      className="
        fixed
        inset-0
        z-[80]
        flex
        items-center
        justify-center
        bg-slate-950/55
        p-4
        backdrop-blur-sm
      "
      role="dialog"
      aria-modal="true"
      aria-label="ตัดยอดใบจัดสินค้า"
    >
      <div
        className="
          flex
          max-h-[92vh]
          w-full
          max-w-6xl
          flex-col
          overflow-hidden
          rounded-3xl
          border
          border-cyan-400/30
          bg-[#f7fbff]
          shadow-2xl
          shadow-cyan-950/25
        "
      >
        <header
          className="
            flex
            flex-col
            gap-4
            border-b
            border-sky-200
            bg-gradient-to-r
            from-white
            to-cyan-50
            px-6
            py-5
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <div
              className="
                flex
                items-center
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-amber-300
                  bg-amber-50
                  text-amber-600
                "
              >
                <PencilLine
                  size={19}
                />
              </div>

              <div>
                <p
                  className="
                    text-[10px]
                    font-semibold
                    tracking-[0.2em]
                    text-sky-600
                  "
                >
                  PICKING ADJUSTMENT
                </p>

                <h3
                  className="
                    mt-1
                    text-xl
                    font-semibold
                    text-slate-900
                  "
                >
                  ตัดยอดใบจัดสินค้า
                </h3>
              </div>
            </div>

            <p
              className="
                mt-3
                text-xs
                text-slate-500
              "
            >
              แก้จำนวนหรือเลือก “ไม่ส่งสินค้า”
              รายการยอด 0 จะไม่ถูกใส่ลงใน Excel
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="
              inline-flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              self-end
              rounded-xl
              border
              border-slate-200
              bg-white
              text-slate-500
              transition
              hover:border-sky-300
              hover:text-sky-700
              disabled:opacity-40
              sm:self-auto
            "
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} />
          </button>
        </header>

        <div
          className="
            grid
            grid-cols-2
            gap-3
            border-b
            border-sky-100
            bg-white
            px-6
            py-4
            sm:grid-cols-4
          "
        >
          <Metric
            label="รายการสินค้า"
            value={
              formatNumber(
                adjustableItems.length,
              )
            }
          />

          <Metric
            label="ยอดเดิม"
            value={
              formatNumber(
                originalTotal,
              )
            }
          />

          <Metric
            label="ยอดหลังตัด"
            value={
              formatNumber(
                adjustedTotal,
              )
            }
            accent
          />

          <Metric
            label="ตัดรายการ"
            value={
              formatNumber(
                excludedCount,
              )
            }
            warning
          />
        </div>

        <div
          className="
            flex-1
            space-y-4
            overflow-y-auto
            bg-slate-50/70
            p-5
          "
        >
          {records.map(
            (record) => {
              const items =
                record.items.filter(
                  (item) =>
                    item.matched &&
                    item.excel_row !==
                      null,
                );

              if (
                items.length === 0
              ) {
                return null;
              }

              return (
                <section
                  key={
                    record.target_sheet
                  }
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-sky-200
                    bg-white
                  "
                >
                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      justify-between
                      gap-3
                      border-b
                      border-sky-100
                      bg-sky-50/70
                      px-4
                      py-3
                    "
                  >
                    <div>
                      <p
                        className="
                          font-semibold
                          text-slate-900
                        "
                      >
                        {record.target_sheet}
                      </p>

                      <p
                        className="
                          mt-1
                          text-[11px]
                          text-slate-500
                        "
                      >
                        {record.warehouse}
                        {" · "}
                        PO {record.po_number}
                      </p>
                    </div>

                    <span
                      className="
                        rounded-full
                        border
                        border-sky-200
                        bg-white
                        px-3
                        py-1
                        text-[10px]
                        font-medium
                        text-sky-700
                      "
                    >
                      {items.length} รายการ
                    </span>
                  </div>

                  <div
                    className="
                      divide-y
                      divide-slate-100
                    "
                  >
                    {items.map(
                      (item) => {
                        const key =
                          poQuantityOverrideKey(
                            record,
                            item,
                          );

                        const quantity =
                          getEffectivePoQuantity(
                            record,
                            item,
                            overrides,
                          );

                        const original =
                          getOriginalPoQuantity(
                            item,
                          );

                        const excluded =
                          quantity === 0;

                        const changed =
                          Object.prototype
                            .hasOwnProperty
                            .call(
                              overrides,
                              key,
                            ) ||
                          Boolean(
                            item.adjusted,
                          );

                        return (
                          <div
                            key={key}
                            className={`
                              grid
                              gap-3
                              px-4
                              py-3
                              transition
                              md:grid-cols-[minmax(0,1fr)_120px_118px]
                              md:items-center
                              ${
                                excluded
                                  ? "bg-red-50/70"
                                  : ""
                              }
                            `}
                          >
                            <div
                              className="
                                min-w-0
                              "
                            >
                              <p
                                className="
                                  truncate
                                  text-sm
                                  font-medium
                                  text-slate-800
                                "
                                title={
                                  item.target_name ??
                                  item.pdf_name
                                }
                              >
                                {
                                  item.target_name ??
                                  item.pdf_name
                                }
                              </p>

                              <p
                                className="
                                  mt-1
                                  text-[10px]
                                  text-slate-500
                                "
                              >
                                Barcode {item.barcode}
                                {" · "}
                                แถว Excel {item.excel_row}
                                {changed && (
                                  <>
                                    {" · "}
                                    เดิม {formatNumber(original)}
                                  </>
                                )}
                              </p>
                            </div>

                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={quantity}
                              disabled={
                                disabled
                              }
                              onChange={(
                                event,
                              ) => {
                                const raw =
                                  event
                                    .target
                                    .value;

                                onChange(
                                  key,
                                  raw === ""
                                    ? 0
                                    : Math.max(
                                        0,
                                        Number(
                                          raw,
                                        ),
                                      ),
                                );
                              }}
                              className="
                                h-10
                                w-full
                                rounded-xl
                                border
                                border-sky-200
                                bg-white
                                px-3
                                text-right
                                text-base
                                font-semibold
                                text-slate-900
                                outline-none
                                transition
                                focus:border-sky-400
                                focus:ring-2
                                focus:ring-sky-200
                                disabled:opacity-50
                              "
                            />

                            <button
                              type="button"
                              disabled={
                                disabled
                              }
                              onClick={() => {
                                if (
                                  excluded
                                ) {
                                  if (
                                    item.adjusted &&
                                    item.original_quantity !==
                                      undefined
                                  ) {
                                    onChange(
                                      key,
                                      item.original_quantity,
                                    );
                                  } else {
                                    onRestore(
                                      key,
                                    );
                                  }
                                } else {
                                  onChange(
                                    key,
                                    0,
                                  );
                                }
                              }}
                              className={`
                                inline-flex
                                h-9
                                items-center
                                justify-center
                                gap-1.5
                                whitespace-nowrap
                                rounded-lg
                                border
                                px-3
                                text-[11px]
                                font-semibold
                                transition
                                disabled:opacity-40
                                ${
                                  excluded
                                    ? "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100"
                                    : "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                                }
                              `}
                            >
                              {excluded ? (
                                <RotateCcw
                                  size={13}
                                />
                              ) : (
                                <Ban
                                  size={13}
                                />
                              )}

                              {
                                excluded
                                  ? "คืนรายการ"
                                  : "ไม่ส่งสินค้า"
                              }
                            </button>
                          </div>
                        );
                      },
                    )}
                  </div>
                </section>
              );
            },
          )}
        </div>

        <footer
          className="
            flex
            flex-col-reverse
            gap-3
            border-t
            border-sky-200
            bg-white
            px-6
            py-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <button
            type="button"
            onClick={onResetAll}
            disabled={
              disabled ||
              Object.keys(
                overrides,
              ).length === 0
            }
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white
              px-4
              py-2.5
              text-sm
              font-medium
              text-slate-600
              transition
              hover:border-sky-300
              hover:text-sky-700
              disabled:opacity-35
            "
          >
            <RotateCcw
              size={16}
            />
            คืนยอดเดิมทั้งหมด
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-amber-400
              bg-amber-500
              px-6
              py-2.5
              text-sm
              font-semibold
              text-white
              shadow-lg
              shadow-amber-500/20
              transition
              hover:bg-amber-600
              disabled:opacity-40
            "
          >
            <Check size={17} />
            ยืนยันยอดที่แก้ไข
          </button>
        </footer>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent = false,
  warning = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
}) {
  const color =
    warning
      ? "text-red-600"
      : accent
        ? "text-emerald-600"
        : "text-slate-900";

  return (
    <div
      className="
        rounded-xl
        border
        border-sky-100
        bg-slate-50
        px-3
        py-2.5
      "
    >
      <p
        className="
          text-[10px]
          text-slate-500
        "
      >
        {label}
      </p>

      <p
        className={`
          mt-1
          text-lg
          font-bold
          ${color}
        `}
      >
        {value}
      </p>
    </div>
  );
}

const formatter =
  new Intl.NumberFormat(
    "th-TH",
    {
      maximumFractionDigits: 2,
    },
  );

function formatNumber(
  value: number,
): string {
  return formatter.format(
    value,
  );
}
