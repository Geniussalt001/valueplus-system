import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardCopy,
  Gift,
  LoaderCircle,
  PackageOpen,
  RotateCcw,
  Trash2,
  Warehouse,
} from "lucide-react";

import {
  productCatalogService,
} from "../../../services/productCatalogService";

import {
  ProcessStatusOverlay,
} from "../../../components/common/ProcessStatusOverlay";

import type {
  ProductCatalogItem,
} from "../../../types/productCatalog.types";


interface DollSummaryPageProps {
  onBack: () => void;
  onNextProcess: () => void;
}

type QuantityByProduct =
  Record<string, string>;

type QuantityByWarehouse =
  Record<string, QuantityByProduct>;

const warehouses = [
  "มหาชัย 1",
  "มหาชัย 2",
  "มหาชัย 3",
  "สำโรง 1",
  "สำโรง 2",
  "ร่มเกล้า 1",
  "ร่มเกล้า 2",
  "ร่มเกล้า 3",
  "ชลบุรี 1",
  "ชลบุรี 2",
  "รังสิต 1",
  "รังสิต 2",
  "โชคชัย 1",
  "โชคชัย 2",
  "เชียงใหม่ 1",
  "เชียงใหม่ (ลาว)",
  "นครสวรรค์ 1",
  "นครสวรรค์ 2",
  "ขอนแก่น 1",
  "ขอนแก่น 2",
  "ขอนแก่น (ลาว)",
  "ขอนแก่น 4",
  "โคราช 1",
  "หาดใหญ่ 1",
  "สุราษฎร์ธานี 1",
  "สุราษฎร์ธานี 2",
] as const;

type WarehouseName =
  (typeof warehouses)[number];

const lineWarehouseGroups: Array<{
  name: string;
  sources: WarehouseName[];
}> = [
  {
    name: "มหาชัย",
    sources: ["มหาชัย 1", "มหาชัย 2", "มหาชัย 3"],
  },
  {
    name: "สำโรง",
    sources: ["สำโรง 1", "สำโรง 2"],
  },
  {
    name: "ร่มเกล้า",
    sources: ["ร่มเกล้า 1", "ร่มเกล้า 2", "ร่มเกล้า 3"],
  },
  {
    name: "ชลบุรี",
    sources: ["ชลบุรี 1", "ชลบุรี 2"],
  },
  {
    name: "รังสิต",
    sources: ["รังสิต 1", "รังสิต 2"],
  },
  {
    name: "โชคชัย",
    sources: ["โชคชัย 1", "โชคชัย 2"],
  },
  {
    name: "เชียงใหม่",
    sources: ["เชียงใหม่ 1"],
  },
  {
    name: "เชียงใหม่ (ลาว)",
    sources: ["เชียงใหม่ (ลาว)"],
  },
  {
    name: "นครสวรรค์",
    sources: ["นครสวรรค์ 1", "นครสวรรค์ 2"],
  },
  {
    name: "ขอนแก่น",
    sources: ["ขอนแก่น 1", "ขอนแก่น 2", "ขอนแก่น 4"],
  },
  {
    name: "ขอนแก่น (ลาว)",
    sources: ["ขอนแก่น (ลาว)"],
  },
  {
    name: "โคราช",
    sources: ["โคราช 1"],
  },
  {
    name: "หาดใหญ่",
    sources: ["หาดใหญ่ 1"],
  },
  {
    name: "สุราษฎร์ธานี",
    sources: ["สุราษฎร์ธานี 1", "สุราษฎร์ธานี 2"],
  },
];

export function DollSummaryPage({
  onBack,
  onNextProcess,
}: DollSummaryPageProps) {
  const [products, setProducts] =
    useState<ProductCatalogItem[]>([]);
  const [quantities, setQuantities] =
    useState<QuantityByWarehouse>({});
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [copied, setCopied] =
    useState(false);
  const [summaryDate, setSummaryDate] =
    useState(getTodayIsoDate());

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      setLoading(true);
      setError("");

      try {
        const catalog =
          await productCatalogService.list();

        if (!active) {
          return;
        }

        setProducts(
          catalog
            .filter((product) => product.active)
            .sort((left, right) =>
              left.display_order - right.display_order ||
              left.product_code.localeCompare(right.product_code),
            ),
        );
      } catch (reason) {
        if (active) {
          setError(getErrorMessage(reason));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const productTotals = useMemo(() => {
    return products.map((product) => ({
      product,
      total: warehouses.reduce(
        (sum, warehouseName) =>
          sum + getQuantity(
            quantities[warehouseName]?.[product.product_code],
          ),
        0,
      ),
    }));
  }, [products, quantities]);

  const grandTotal = useMemo(() =>
    productTotals.reduce(
      (sum, item) => sum + item.total,
      0,
    ),
  [productTotals]);

  const filledWarehouseCount = useMemo(() =>
    warehouses.filter((warehouseName) =>
      Object.values(quantities[warehouseName] ?? {})
        .some((value) => getQuantity(value) > 0),
    ).length,
  [quantities]);

  function updateQuantity(
    warehouseName: string,
    productCode: string,
    value: string,
  ) {
    const normalized = value
      .replace(/[^0-9]/g, "")
      .replace(/^0+(?=\d)/, "");

    setCopied(false);
    setQuantities((current) => ({
      ...current,
      [warehouseName]: {
        ...(current[warehouseName] ?? {}),
        [productCode]: normalized,
      },
    }));
  }

  function clearWarehouse(
    warehouseName: string,
  ) {
    setCopied(false);
    setQuantities((current) => ({
      ...current,
      [warehouseName]: {},
    }));
  }

  function clearAll() {
    if (
      grandTotal > 0 &&
      !window.confirm("ล้างยอดที่กรอกทั้งหมดหรือไม่?")
    ) {
      return;
    }

    setCopied(false);
    setQuantities({});
  }

  async function copyLineSummary() {
    if (grandTotal <= 0) {
      setError("กรุณากรอกยอดอย่างน้อย 1 รายการก่อนคัดลอก");
      return;
    }

    setError("");

    try {
      const lineSummary =
        createLineSummary(products, quantities, summaryDate);

      if (lineSummary.length > 10_000) {
        setError(
          `ข้อความมี ${formatNumber(lineSummary.length)} ตัวอักษร เกินขีดจำกัด 10,000 ตัวอักษร กรุณาลดยอดที่ไม่ต้องการส่ง`,
        );
        return;
      }

      await navigator.clipboard.writeText(
        lineSummary,
      );
      setCopied(true);
    } catch (reason) {
      setError(`คัดลอกข้อความไม่สำเร็จ: ${getErrorMessage(reason)}`);
    }
  }

  return (
    <div className="vp-work-page doll-summary mx-auto max-w-[1720px] px-6 py-8 lg:px-10">
      <ProcessStatusOverlay
        open={loading}
        title="กำลังโหลดข้อมูลสินค้าสำหรับสรุปยอดตุ๊กตา..."
      />
      <header className="vp-page-header flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-5 flex items-center gap-2 text-sm text-slate-500 transition hover:text-blue-600"
          >
            <ArrowLeft size={17} />
            กลับหน้าเลือกประเภทสรุปยอด
          </button>

          <p className="text-[10px] font-semibold tracking-[0.24em] text-blue-600">
            DOLL SUMMARY
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            สรุปยอดตุ๊กตา
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            คีย์ยอดด้วยมือแยกตามคลัง ระบบรวมยอดสินค้าให้แบบ Realtime
          </p>
        </div>

        <div className="vp-header-actions flex flex-wrap items-center justify-end gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-slate-600">
            <CalendarDays size={17} className="text-blue-600" />
            <input
              type="date"
              value={summaryDate}
              onChange={(event) => {
                setSummaryDate(event.target.value);
              }}
              className="border-0 bg-transparent p-1 text-sm font-semibold text-slate-800 outline-none"
            />
          </label>

          <button
            type="button"
            onClick={clearAll}
            className="vp-action-button vp-action-danger flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-600"
          >
            <RotateCcw size={17} />
            ล้างยอดทั้งหมด
          </button>

          <div className="vp-page-icon flex h-12 w-12 items-center justify-center rounded-xl border border-blue-300/35 bg-blue-50 text-blue-600">
            <Gift size={23} />
          </div>
        </div>
      </header>

      {error && (
        <div className="mt-5 rounded-xl border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 text-slate-500">
            <LoaderCircle className="animate-spin text-blue-600" size={22} />
            กำลังโหลดข้อมูลสินค้า
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="mt-8 flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white text-center">
          <PackageOpen size={38} className="text-slate-400" />
          <p className="mt-4 font-semibold text-slate-800">
            ไม่พบสินค้าที่เปิดใช้งาน
          </p>
          <p className="mt-2 text-sm text-slate-500">
            กรุณาเปิดใช้งานสินค้าในหน้าจัดการข้อมูลสินค้าก่อน
          </p>
        </div>
      ) : (
        <div className="mt-7 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="grid min-w-0 gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {warehouses.map((warehouseName) => (
              <WarehouseCard
                key={warehouseName}
                warehouseName={warehouseName}
                products={products}
                quantities={quantities[warehouseName] ?? {}}
                onChange={(productCode, value) => {
                  updateQuantity(warehouseName, productCode, value);
                }}
                onClear={() => {
                  clearWarehouse(warehouseName);
                }}
              />
            ))}
          </section>

          <aside className="xl:sticky xl:top-6">
            <div className="overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-[0_18px_50px_rgba(37,99,235,0.10)]">
              <div className="doll-realtime-header border-b border-blue-100 bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.2em] text-blue-100">
                      REALTIME SUMMARY
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      ยอดรวมตุ๊กตา
                    </h3>
                  </div>
                  <Gift size={25} />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <SummaryStat label="สินค้า" value={products.length} />
                  <SummaryStat label="รอบที่กรอก" value={filledWarehouseCount} />
                  <SummaryStat label="จำนวนรวม" value={grandTotal} />
                </div>
              </div>

              <div className="max-h-[calc(100vh-430px)] min-h-[300px] overflow-y-auto p-4">
                <div className="space-y-2">
                  {productTotals.map(({ product, total }) => (
                    <div
                      key={product.product_code}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {product.display_name}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {product.product_code}
                        </p>
                      </div>
                      <span className="shrink-0 text-base font-bold text-blue-600">
                        {formatNumber(total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 p-4">
                <button
                  type="button"
                  onClick={() => {
                    void copyLineSummary();
                  }}
                  className="doll-line-button flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500 bg-emerald-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
                >
                  {copied ? <Check size={18} /> : <ClipboardCopy size={18} />}
                  {copied ? "คัดลอกเรียบร้อยแล้ว" : "คัดลอกส่ง LINE"}
                </button>

                {copied && (
                  <button
                    type="button"
                    onClick={onNextProcess}
                    className="vp-next-process mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-600"
                  >
                    Next Process
                    <ArrowRight size={18} />
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

    </div>
  );
}

function WarehouseCard({
  warehouseName,
  products,
  quantities,
  onChange,
  onClear,
}: {
  warehouseName: string;
  products: ProductCatalogItem[];
  quantities: QuantityByProduct;
  onChange: (productCode: string, value: string) => void;
  onClear: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Warehouse size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
              {warehouseName}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              {products.length} รายการสินค้า
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          title={`ล้างยอด ${warehouseName}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-300 hover:text-red-600"
        >
          <Trash2 size={16} />
        </button>
      </header>

      <div className="max-h-[510px] overflow-y-auto p-3">
        <div className="space-y-2">
          {products.map((product) => (
            <label
              key={product.product_code}
              className="grid grid-cols-[minmax(0,1fr)_86px] items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 transition focus-within:border-blue-400 focus-within:bg-blue-50/40"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">
                  {product.display_name}
                </span>
                <span className="mt-1 block text-[10px] text-slate-400">
                  {product.product_code}
                </span>
              </span>

              <input
                type="text"
                inputMode="numeric"
                data-doll-quantity-input="true"
                value={quantities[product.product_code] ?? ""}
                onChange={(event) => {
                  onChange(product.product_code, event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") {
                    return;
                  }

                  event.preventDefault();
                  focusNextQuantityInput(
                    event.currentTarget,
                  );
                }}
                placeholder="0"
                aria-label={`${warehouseName} ${product.display_name}`}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-right text-base font-bold text-blue-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          ))}
        </div>
      </div>

    </article>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-3">
      <p className="text-[10px] text-blue-100">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-white">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function createLineSummary(
  products: ProductCatalogItem[],
  quantities: QuantityByWarehouse,
  summaryDate: string,
): string {
  const currentDate = formatDisplayDate(summaryDate);
  const sections: string[] = [
    `สรุปยอด ประจำวันที่ ${currentDate}`,
  ];

  for (const warehouseGroup of lineWarehouseGroups) {
    const rows = products
      .map((product) => ({
        name: product.line_name || product.display_name,
        quantity: warehouseGroup.sources.reduce(
          (sum, warehouseName) =>
            sum + getQuantity(
              quantities[warehouseName]?.[product.product_code],
            ),
          0,
        ),
      }))
      .filter((row) => row.quantity > 0);

    if (rows.length === 0) {
      continue;
    }

    sections.push(
      [
        warehouseGroup.name,
        ...rows.map((row) =>
          `• ${row.name} : ${formatNumber(row.quantity)}`,
        ),
      ].join("\n"),
    );
  }

  const totals = products
    .map((product) => ({
      name: product.line_name || product.display_name,
      quantity: warehouses.reduce(
        (sum, warehouseName) =>
          sum + getQuantity(
            quantities[warehouseName]?.[product.product_code],
          ),
        0,
      ),
    }))
    .filter((row) => row.quantity > 0);

  sections.push(
    [
      "ยอดรวมทั้งหมด",
      ...totals.map((row) =>
        `• ${row.name} : ${formatNumber(row.quantity)}`,
      ),
    ].join("\n"),
  );

  return sections.join("\n\n--------------------------------\n\n");
}

function getQuantity(
  value: string | undefined,
): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function focusNextQuantityInput(
  currentInput: HTMLInputElement,
): void {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement>(
      '[data-doll-quantity-input="true"]',
    ),
  );

  const currentIndex = inputs.indexOf(
    currentInput,
  );
  const nextInput = inputs[
    currentIndex + 1
  ];

  if (nextInput) {
    nextInput.focus();
    nextInput.select();
    return;
  }

  currentInput.blur();
}

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat("th-TH").format(value);
}

function formatThaiDate(
  date: Date,
): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getTodayIsoDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(
  value: string,
): string {
  const [year, month, day] =
    value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return formatThaiDate(
    new Date(year, month - 1, day),
  );
}

function getErrorMessage(
  reason: unknown,
): string {
  return reason instanceof Error
    ? reason.message
    : String(reason);
}
