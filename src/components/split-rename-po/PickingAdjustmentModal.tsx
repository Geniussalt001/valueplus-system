import {
  Ban,
  Check,
  ChevronDown,
  ChevronUp,
  PackageSearch,
  PencilLine,
  RotateCcw,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  PoPreviewRecord,
  PoProductMatch,
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

interface RealtimeProduct {
  key: string;
  barcode: string;
  name: string;
  original: number;
  current: number;
  excludedCount: number;
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
  const [
    expandedSheets,
    setExpandedSheets,
  ] = useState<Set<string>>(
    new Set(),
  );

  const adjustableRecords =
    useMemo(
      () =>
        records
          .map((record) => ({
            record,
            items:
              getAdjustableItems(
                record,
              ),
          }))
          .filter(
            (entry) =>
              entry.items.length > 0,
          ),
      [records],
    );

  useEffect(() => {
    if (
      !open ||
      adjustableRecords.length === 0
    ) {
      return;
    }

    setExpandedSheets(
      (current) => {
        if (current.size > 0) {
          return current;
        }

        return new Set([
          adjustableRecords[0]
            .record
            .target_sheet,
        ]);
      },
    );
  }, [
    open,
    adjustableRecords,
  ]);

  const adjustableItems =
    useMemo(
      () =>
        adjustableRecords
          .flatMap(
            ({ record, items }) =>
              items.map(
                (item) => ({
                  record,
                  item,
                }),
              ),
          ),
      [adjustableRecords],
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

  const realtimeProducts =
    useMemo(
      () =>
        buildRealtimeProducts(
          records,
          overrides,
        ),
      [records, overrides],
    );

  if (!open) {
    return null;
  }

  const allExpanded =
    adjustableRecords.length > 0 &&
    adjustableRecords.every(
      ({ record }) =>
        expandedSheets.has(
          record.target_sheet,
        ),
    );

  function toggleSheet(
    sheetName: string,
  ) {
    setExpandedSheets(
      (current) => {
        const next =
          new Set(current);

        if (next.has(sheetName)) {
          next.delete(sheetName);
        } else {
          next.add(sheetName);
        }

        return next;
      },
    );
  }

  function toggleAll() {
    if (allExpanded) {
      setExpandedSheets(
        new Set(),
      );
      return;
    }

    setExpandedSheets(
      new Set(
        adjustableRecords.map(
          ({ record }) =>
            record.target_sheet,
        ),
      ),
    );
  }

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
          h-[92vh]
          w-full
          max-w-[1420px]
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
            shrink-0
            flex-col
            gap-4
            border-b
            border-sky-200
            bg-gradient-to-r
            from-white
            to-cyan-50
            px-6
            py-4
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
                mt-2
                text-xs
                text-slate-500
              "
            >
              ยอด Realtime ด้านขวาจะเปลี่ยนทันที
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
            shrink-0
            grid-cols-2
            gap-3
            border-b
            border-sky-100
            bg-white
            px-6
            py-3
            sm:grid-cols-4
          "
        >
          <Metric
            label="รายการสินค้า"
            value={formatNumber(
              adjustableItems.length,
            )}
          />

          <Metric
            label="ยอดเดิม"
            value={formatNumber(
              originalTotal,
            )}
          />

          <Metric
            label="ยอดคงเหลือ"
            value={formatNumber(
              adjustedTotal,
            )}
            accent
          />

          <Metric
            label="ไม่ส่งสินค้า"
            value={formatNumber(
              excludedCount,
            )}
            warning
          />
        </div>

        <div
          className="
            grid
            min-h-0
            flex-1
            gap-4
            bg-slate-50/70
            p-4
            lg:grid-cols-[minmax(0,1fr)_360px]
          "
        >
          <section
            className="
              flex
              min-h-0
              flex-col
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
                shrink-0
                items-center
                justify-between
                border-b
                border-sky-100
                px-4
                py-3
              "
            >
              <div>
                <p
                  className="
                    text-sm
                    font-semibold
                    text-slate-900
                  "
                >
                  รายการแยกตามคลัง
                </p>
                <p
                  className="
                    mt-0.5
                    text-[11px]
                    text-slate-500
                  "
                >
                  กดหัวข้อคลังเพื่อเปิดหรือพับรายการ
                </p>
              </div>

              <button
                type="button"
                onClick={toggleAll}
                className="
                  rounded-lg
                  border
                  border-sky-200
                  bg-sky-50
                  px-3
                  py-1.5
                  text-[11px]
                  font-semibold
                  text-sky-700
                  transition
                  hover:bg-sky-100
                "
              >
                {allExpanded
                  ? "พับทั้งหมด"
                  : "เปิดทั้งหมด"}
              </button>
            </div>

            <div
              className="
                flex-1
                space-y-3
                overflow-y-auto
                p-3
              "
            >
              {adjustableRecords.map(
                ({ record, items }) => (
                  <WarehouseDrawer
                    key={
                      record.target_sheet
                    }
                    record={record}
                    items={items}
                    overrides={
                      overrides
                    }
                    expanded={
                      expandedSheets.has(
                        record.target_sheet,
                      )
                    }
                    disabled={disabled}
                    onToggle={() => {
                      toggleSheet(
                        record.target_sheet,
                      );
                    }}
                    onChange={onChange}
                    onRestore={
                      onRestore
                    }
                  />
                ),
              )}
            </div>
          </section>

          <RealtimePanel
            products={realtimeProducts}
            adjustedTotal={adjustedTotal}
            originalTotal={originalTotal}
          />
        </div>

        <footer
          className="
            flex
            shrink-0
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

function WarehouseDrawer({
  record,
  items,
  overrides,
  expanded,
  disabled,
  onToggle,
  onChange,
  onRestore,
}: {
  record: PoPreviewRecord;
  items: PoProductMatch[];
  overrides: PoQuantityOverrides;
  expanded: boolean;
  disabled: boolean;
  onToggle: () => void;
  onChange: (
    key: string,
    value: number,
  ) => void;
  onRestore: (
    key: string,
  ) => void;
}) {
  const currentTotal =
    items.reduce(
      (total, item) =>
        total +
        getEffectivePoQuantity(
          record,
          item,
          overrides,
        ),
      0,
    );

  const excludedCount =
    items.filter(
      (item) =>
        getEffectivePoQuantity(
          record,
          item,
          overrides,
        ) === 0,
    ).length;

  return (
    <article
      className="
        overflow-hidden
        rounded-xl
        border
        border-sky-200
        bg-white
      "
    >
      <button
        type="button"
        onClick={onToggle}
        className="
          flex
          w-full
          items-center
          justify-between
          gap-3
          bg-sky-50/80
          px-4
          py-3
          text-left
          transition
          hover:bg-sky-100
        "
        aria-expanded={expanded}
      >
        <div
          className="
            min-w-0
          "
        >
          <p
            className="
              truncate
              font-semibold
              text-slate-900
            "
          >
            {record.target_sheet}
          </p>

          <p
            className="
              mt-1
              truncate
              text-[11px]
              text-slate-500
            "
          >
            {record.warehouse}
            {" · "}
            PO {record.po_number}
          </p>
        </div>

        <div
          className="
            flex
            shrink-0
            items-center
            gap-2
          "
        >
          <span
            className="
              rounded-full
              border
              border-sky-200
              bg-white
              px-2.5
              py-1
              text-[10px]
              font-semibold
              text-sky-700
            "
          >
            {formatNumber(
              currentTotal,
            )} ชิ้น
          </span>

          {excludedCount > 0 && (
            <span
              className="
                rounded-full
                border
                border-red-200
                bg-red-50
                px-2.5
                py-1
                text-[10px]
                font-semibold
                text-red-600
              "
            >
              ตัด {excludedCount}
            </span>
          )}

          {expanded ? (
            <ChevronUp
              size={17}
              className="
                text-sky-700
              "
            />
          ) : (
            <ChevronDown
              size={17}
              className="
                text-sky-700
              "
            />
          )}
        </div>
      </button>

      {expanded && (
        <div
          className="
            divide-y
            divide-slate-100
          "
        >
          {items.map(
            (item) => (
              <AdjustmentRow
                key={
                  poQuantityOverrideKey(
                    record,
                    item,
                  )
                }
                record={record}
                item={item}
                overrides={overrides}
                disabled={disabled}
                onChange={onChange}
                onRestore={
                  onRestore
                }
              />
            ),
          )}
        </div>
      )}
    </article>
  );
}

function AdjustmentRow({
  record,
  item,
  overrides,
  disabled,
  onChange,
  onRestore,
}: {
  record: PoPreviewRecord;
  item: PoProductMatch;
  overrides: PoQuantityOverrides;
  disabled: boolean;
  onChange: (
    key: string,
    value: number,
  ) => void;
  onRestore: (
    key: string,
  ) => void;
}) {
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

  function restoreItem() {
    if (
      item.adjusted &&
      item.original_quantity !==
        undefined
    ) {
      onChange(
        key,
        item.original_quantity,
      );
      return;
    }

    onRestore(key);
  }

  return (
    <div
      className={`
        grid
        gap-3
        px-4
        py-3
        transition
        md:grid-cols-[minmax(0,1fr)_110px_112px]
        md:items-center
        ${excluded
          ? "bg-red-50/70"
          : ""}
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
          {item.target_name ??
            item.pdf_name}
        </p>

        <p
          className="
            mt-1
            text-[10px]
            text-slate-500
          "
        >
          {item.barcode}
          {" · "}
          แถว {item.excel_row}
          {changed && (
            <>
              {" · "}
              เดิม {formatNumber(
                original,
              )}
            </>
          )}
        </p>
      </div>

      <input
        type="number"
        min="0"
        step="1"
        value={quantity}
        disabled={disabled}
        onChange={(event) => {
          const raw =
            event.target.value;

          onChange(
            key,
            raw === ""
              ? 0
              : Math.max(
                  0,
                  Number(raw),
                ),
          );
        }}
        className="
          h-9
          w-full
          rounded-lg
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
        disabled={disabled}
        onClick={() => {
          if (excluded) {
            restoreItem();
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
          px-2.5
          text-[11px]
          font-semibold
          transition
          disabled:opacity-40
          ${excluded
            ? "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100"
            : "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"}
        `}
      >
        {excluded ? (
          <RotateCcw
            size={13}
          />
        ) : (
          <Ban size={13} />
        )}

        {excluded
          ? "คืนรายการ"
          : "ไม่ส่งสินค้า"}
      </button>
    </div>
  );
}

function RealtimePanel({
  products,
  adjustedTotal,
  originalTotal,
}: {
  products: RealtimeProduct[];
  adjustedTotal: number;
  originalTotal: number;
}) {
  return (
    <aside
      className="
        flex
        min-h-[300px]
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-cyan-300/40
        bg-white
        shadow-lg
        shadow-cyan-900/10
      "
    >
      <div
        className="
          shrink-0
          bg-gradient-to-br
          from-[#073a59]
          to-[#0b5878]
          px-5
          py-4
          text-white
        "
      >
        <div
          className="
            flex
            items-start
            justify-between
            gap-3
          "
        >
          <div>
            <p
              className="
                text-[10px]
                font-semibold
                tracking-[0.18em]
                text-cyan-200
              "
            >
              REALTIME SUMMARY
            </p>

            <h4
              className="
                mt-1
                text-lg
                font-semibold
              "
            >
              ยอดรวมสินค้าทุกคลัง
            </h4>
          </div>

          <PackageSearch
            size={22}
            className="
              text-cyan-200
            "
          />
        </div>

        <div
          className="
            mt-4
            grid
            grid-cols-2
            gap-2
          "
        >
          <div
            className="
              rounded-xl
              border
              border-white/20
              bg-white/10
              px-3
              py-2
            "
          >
            <p
              className="
                text-[10px]
                text-cyan-100
              "
            >
              ยอดเดิม
            </p>
            <p
              className="
                mt-1
                text-lg
                font-bold
              "
            >
              {formatNumber(
                originalTotal,
              )}
            </p>
          </div>

          <div
            className="
              rounded-xl
              border
              border-emerald-300/35
              bg-emerald-300/15
              px-3
              py-2
            "
          >
            <p
              className="
                text-[10px]
                text-emerald-100
              "
            >
              ยอดคงเหลือ
            </p>
            <p
              className="
                mt-1
                text-lg
                font-bold
                text-emerald-200
              "
            >
              {formatNumber(
                adjustedTotal,
              )}
            </p>
          </div>
        </div>
      </div>

      <div
        className="
          flex
          min-h-0
          flex-1
          flex-col
        "
      >
        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-sky-100
            px-4
            py-3
          "
        >
          <p
            className="
              text-xs
              font-semibold
              text-slate-700
            "
          >
            รวมตามรายการสินค้า
          </p>

          <span
            className="
              rounded-full
              border
              border-sky-200
              px-2.5
              py-1
              text-[10px]
              font-semibold
              text-sky-700
            "
          >
            {products.length} รายการ
          </span>
        </div>

        <div
          className="
            flex-1
            space-y-2
            overflow-y-auto
            bg-slate-50/70
            p-3
          "
        >
          {products.map(
            (product) => {
              const difference =
                product.original -
                product.current;

              return (
                <div
                  key={product.key}
                  className={`
                    rounded-xl
                    border
                    bg-white
                    px-3
                    py-2.5
                    ${product.current === 0
                      ? "border-red-200"
                      : "border-sky-100"}
                  `}
                >
                  <div
                    className="
                      flex
                      items-start
                      justify-between
                      gap-3
                    "
                  >
                    <div
                      className="
                        min-w-0
                      "
                    >
                      <p
                        className="
                          truncate
                          text-xs
                          font-semibold
                          text-slate-800
                        "
                        title={
                          product.name
                        }
                      >
                        {product.name}
                      </p>

                      <p
                        className="
                          mt-1
                          text-[9px]
                          text-slate-500
                        "
                      >
                        {product.barcode}
                      </p>
                    </div>

                    <p
                      className={`
                        shrink-0
                        text-base
                        font-bold
                        ${product.current === 0
                          ? "text-red-600"
                          : "text-emerald-600"}
                      `}
                    >
                      {formatNumber(
                        product.current,
                      )}
                    </p>
                  </div>

                  {difference > 0 && (
                    <div
                      className="
                        mt-2
                        flex
                        items-center
                        justify-between
                        border-t
                        border-slate-100
                        pt-1.5
                        text-[9px]
                      "
                    >
                      <span
                        className="
                          text-slate-500
                        "
                      >
                        เดิม {formatNumber(
                          product.original,
                        )}
                      </span>

                      <span
                        className="
                          font-semibold
                          text-red-600
                        "
                      >
                        ลด {formatNumber(
                          difference,
                        )}
                      </span>
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      </div>
    </aside>
  );
}

function buildRealtimeProducts(
  records: PoPreviewRecord[],
  overrides: PoQuantityOverrides,
): RealtimeProduct[] {
  const products =
    new Map<
      string,
      RealtimeProduct
    >();

  for (const record of records) {
    for (
      const item
      of getAdjustableItems(
        record,
      )
    ) {
      const key =
        item.barcode ||
        item.target_name ||
        item.pdf_name;

      const existing =
        products.get(key) ?? {
          key,
          barcode:
            item.barcode,
          name:
            item.target_name ??
            item.data_name ??
            item.pdf_name,
          original: 0,
          current: 0,
          excludedCount: 0,
        };

      const current =
        getEffectivePoQuantity(
          record,
          item,
          overrides,
        );

      existing.original +=
        getOriginalPoQuantity(
          item,
        );
      existing.current +=
        current;

      if (current === 0) {
        existing.excludedCount +=
          1;
      }

      products.set(
        key,
        existing,
      );
    }
  }

  return Array.from(
    products.values(),
  ).sort(
    (left, right) =>
      right.current -
        left.current ||
      left.name.localeCompare(
        right.name,
        "th",
      ),
  );
}

function getAdjustableItems(
  record: PoPreviewRecord,
): PoProductMatch[] {
  return record.items.filter(
    (item) =>
      item.matched &&
      item.excel_row !== null,
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
        py-2
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
