import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  listen,
} from "@tauri-apps/api/event";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CirclePause,
  CirclePlay,
  FileSearch,
  FileUp,
  MonitorDot,
  Octagon,
  PackageMinus,
  PackagePlus,
  Play,
  ReceiptText,
  Save,
} from "lucide-react";

import {
  ProcessStatusOverlay,
} from "../../components/common/ProcessStatusOverlay";

import {
  salesBillingService,
} from "../../services/salesBillingService";

import type {
  SalesBillingOrder,
  SalesBillingPreview,
  SalesBillingProgress,
} from "../../types/salesBilling.types";

interface SalesBillingPageProps {
  onBack: () => void;
  initialPdfPath?: string;
  initialIvNumber?: string;
  onInitialPdfConsumed?: () => void;
  onNextProcess: (pdfPath: string) => void;
}

type Activity =
  | "idle"
  | "selecting"
  | "previewing"
  | "running";

export function SalesBillingPage({
  onBack,
  initialPdfPath,
  initialIvNumber = "",
  onInitialPdfConsumed,
  onNextProcess,
}: SalesBillingPageProps) {
  const consumedPdfRef =
    useRef("");
  const [pdfPath, setPdfPath] =
    useState("");
  const [startIv, setStartIv] =
    useState("");
  const [preview, setPreview] =
    useState<SalesBillingPreview | null>(
      null,
    );
  const [activity, setActivity] =
    useState<Activity>("idle");
  const [expandedPo, setExpandedPo] =
    useState<string | null>(null);
  const [progress, setProgress] =
    useState<SalesBillingProgress | null>(
      null,
    );
  const [paused, setPaused] =
    useState(false);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");
  const [mappingDrafts, setMappingDrafts] =
    useState<Record<string, string>>({});
  const [savingProduct, setSavingProduct] =
    useState("");

  useEffect(() => {
    if (
      !initialPdfPath ||
      consumedPdfRef.current ===
        initialPdfPath
    ) {
      return;
    }

    consumedPdfRef.current =
      initialPdfPath;
    setPdfPath(initialPdfPath);
    if (initialIvNumber) {
      setStartIv(
        normalizeIvDigits(
          initialIvNumber,
        ),
      );
    }
    setPreview(null);
    setProgress(null);
    setError("");
    setSuccess(
      "รับไฟล์ PDF จากขั้นตอนลงยอด SO แล้ว",
    );
    onInitialPdfConsumed?.();
  }, [
    initialPdfPath,
    initialIvNumber,
    onInitialPdfConsumed,
  ]);

  useEffect(() => {
    let active = true;
    let stopListening:
      | (() => void)
      | undefined;

    void listen<SalesBillingProgress>(
      "sales-billing-progress",
      (event) => {
        if (!active) {
          return;
        }
        setProgress(event.payload);
        if (
          event.payload.type ===
          "control"
        ) {
          if (
            event.payload.action ===
            "PAUSE"
          ) {
            setPaused(true);
          } else if (
            event.payload.action ===
            "RESUME"
          ) {
            setPaused(false);
          } else if (
            event.payload.action ===
            "STOP"
          ) {
            setPaused(false);
            setSuccess("");
          }
        }
        if (
          event.payload.type ===
          "finished"
        ) {
          setPaused(false);
          if (event.payload.success) {
            setSuccess(
              event.payload.message ??
                "เปิดบิลเสร็จสิ้น",
            );
          }
        }
      },
    ).then((unlisten) => {
      if (active) {
        stopListening = unlisten;
      } else {
        unlisten();
      }
    });

    return () => {
      active = false;
      stopListening?.();
    };
  }, []);

  const orders =
    preview?.orders ?? [];

  const selectedOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.selected !== false &&
          isOrderReady(order),
      ),
    [orders],
  );

  const newProducts = useMemo(() => {
    const products = new Map<
      string,
      SalesBillingOrder["items"][number]
    >();

    for (const order of orders) {
      for (const item of order.items) {
        if (
          item.match_status === "unmatched" ||
          item.match_method === "fuzzy_name"
        ) {
          products.set(
            item.cpall_code,
            item,
          );
        }
      }
    }

    return [...products.values()];
  }, [orders]);

  const currentPercent = useMemo(() => {
    if (
      !progress ||
      !progress.orderTotal
    ) {
      return 0;
    }
    const orderPart =
      progress.orderIndex ?? 0;
    const itemPart =
      progress.itemTotal &&
      progress.itemIndex !==
        undefined &&
      progress.itemIndex >= 0
        ? (progress.itemIndex + 1) /
          progress.itemTotal
        : 0;
    return Math.min(
      100,
      Math.round(
        ((orderPart + itemPart) /
          progress.orderTotal) *
          100,
      ),
    );
  }, [progress]);

  const busy =
    activity !== "idle";

  async function choosePdf() {
    setActivity("selecting");
    setError("");
    try {
      const path =
        await salesBillingService
          .selectPdf();
      if (path) {
        setPdfPath(path);
        setPreview(null);
        setProgress(null);
        setSuccess("");
      }
    } catch (requestError) {
      setError(
        getErrorMessage(requestError),
      );
    } finally {
      setActivity("idle");
    }
  }

  async function buildPreview() {
    if (!pdfPath || !/^\d+$/.test(startIv)) {
      setError(
        "กรุณาเลือก PDF และระบุเลข IV เริ่มต้น",
      );
      return;
    }
    setActivity("previewing");
    setError("");
    setSuccess("");
    setProgress(null);
    try {
      const result =
        await salesBillingService
          .preview(
            pdfPath,
            `VPR${startIv}`,
          );
      setPreview({
        ...result,
        orders: result.orders.map(
          (order) => ({
            ...order,
            selected: order.ready,
            items: order.items.map(
              (item) => ({
                ...item,
                original_quantity:
                  item.quantity,
                adjusted: false,
                excluded_by_quantity:
                  false,
              }),
            ),
          }),
        ),
      });
    } catch (requestError) {
      setPreview(null);
      setError(
        getErrorMessage(requestError),
      );
    } finally {
      setActivity("idle");
    }
  }

  async function saveNewProduct(
    item: SalesBillingOrder["items"][number],
  ) {
    const expressCode =
      normalizeExpressCode(
        mappingDrafts[item.cpall_code] ??
          item.express_code,
      );

    if (
      !/^\d{2}-\d{4}-\d{2}$/.test(
        expressCode,
      )
    ) {
      setError(
        "กรุณากรอกรหัส Express รูปแบบ 01-0000-00",
      );
      return;
    }

    setSavingProduct(item.cpall_code);
    setError("");
    setSuccess("");

    try {
      await salesBillingService
        .saveProductMapping({
          cpallCode: item.cpall_code,
          barcode: item.barcode,
          pdfName: item.pdf_name,
          expressCode,
        });

      const result =
        await salesBillingService.preview(
          pdfPath,
          `VPR${startIv}`,
        );

      setPreview({
        ...result,
        orders: result.orders.map(
          (order) => ({
            ...order,
            selected: order.ready,
            items: order.items.map(
              (item) => ({
                ...item,
                original_quantity:
                  item.quantity,
                adjusted: false,
                excluded_by_quantity:
                  false,
              }),
            ),
          }),
        ),
      });
      setMappingDrafts((current) => {
        const next = { ...current };
        delete next[item.cpall_code];
        return next;
      });
      setSuccess(
        `บันทึกสินค้า ${item.cpall_code} และรหัส Express ${expressCode} เรียบร้อยแล้ว`,
      );
    } catch (requestError) {
      setError(
        getErrorMessage(requestError),
      );
    } finally {
      setSavingProduct("");
    }
  }

  async function runBilling() {
    if (
      !preview ||
      selectedOrders.length === 0
    ) {
      setError(
        "กรุณาเลือก IV ที่พร้อมอย่างน้อย 1 รายการ",
      );
      return;
    }
    if (
      !window.confirm(
        `ยืนยันเปิดบิลจริง ${selectedOrders.length} IV?\n\nกรุณาเปิด Express ที่หน้า IV และงดใช้เมาส์หรือคีย์บอร์ดจนกว่างานจะเสร็จ`,
      )
    ) {
      return;
    }
    setActivity("running");
    setError("");
    setSuccess("");
    setProgress({
      type: "progress",
      step: "กำลังเชื่อมต่อ Express",
      orderIndex: 0,
      orderTotal:
        selectedOrders.length,
    });
    try {
      const result =
        await salesBillingService.run(
          selectedOrders,
          false,
        );
      setProgress(result);
      if (result.success) {
        setSuccess(
          result.message ??
            "ดำเนินการเสร็จสิ้น",
        );
      } else {
        setError(
          result.message ??
            "ระบบหยุดทำงาน",
        );
      }
    } catch (requestError) {
      setError(
        getErrorMessage(requestError),
      );
    } finally {
      setActivity("idle");
      setPaused(false);
    }
  }

  async function sendControl(
    action:
      | "PAUSE"
      | "RESUME"
      | "STOP",
  ) {
    try {
      await salesBillingService
        .control(action);
      setPaused(action === "PAUSE");
      if (action === "STOP") {
        setSuccess("");
      }
    } catch (requestError) {
      setError(
        getErrorMessage(requestError),
      );
    }
  }

  function updateOrders(
    transform: (
      orders: SalesBillingOrder[],
    ) => SalesBillingOrder[],
  ) {
    setPreview((current) =>
      current
        ? {
            ...current,
            orders: transform(
              current.orders,
            ),
          }
        : current,
    );
  }

  function moveOrder(
    index: number,
    direction: -1 | 1,
  ) {
    updateOrders((current) => {
      const nextIndex =
        index + direction;
      if (
        nextIndex < 0 ||
        nextIndex >= current.length
      ) {
        return current;
      }
      const next = [...current];
      [
        next[index],
        next[nextIndex],
      ] = [
        next[nextIndex],
        next[index],
      ];
      return next;
    });
  }

  function toggleOrder(
    poNumber: string,
  ) {
    updateOrders((current) =>
      current.map((order) =>
        order.po_number === poNumber
          ? {
              ...order,
              selected:
                !(
                  order.selected !==
                  false
                ),
            }
          : order,
      ),
    );
  }

  function toggleItem(
    poNumber: string,
    itemIndex: number,
  ) {
    updateOrders((current) =>
      current.map((order) =>
        order.po_number === poNumber
          ? {
              ...order,
              items: order.items.map(
                (item, index) =>
                  index === itemIndex
                    ? {
                        ...item,
                        excluded:
                          !item.excluded,
                        excluded_by_quantity:
                          false,
                      }
                    : item,
              ),
            }
          : order,
      ),
    );
  }

  function setItemQuantity(
    poNumber: string,
    itemIndex: number,
    quantity: number,
  ) {
    if (
      !Number.isFinite(quantity) ||
      quantity < 0
    ) {
      return;
    }

    updateOrders((current) =>
      current.map((order) =>
        order.po_number === poNumber
          ? {
              ...order,
              items: order.items.map(
                (item, index) => {
                  if (index !== itemIndex) {
                    return item;
                  }
                  const original =
                    item.original_quantity ??
                    item.quantity;
                  return {
                    ...item,
                    quantity,
                    original_quantity:
                      original,
                    adjusted:
                      quantity !== original,
                    excluded:
                      quantity === 0
                        ? true
                        : item.excluded_by_quantity
                          ? false
                          : item.excluded,
                    excluded_by_quantity:
                      quantity === 0,
                  };
                },
              ),
            }
          : order,
      ),
    );
  }

  function restoreItemQuantity(
    poNumber: string,
    itemIndex: number,
  ) {
    updateOrders((current) =>
      current.map((order) =>
        order.po_number === poNumber
          ? {
              ...order,
              items: order.items.map(
                (item, index) =>
                  index === itemIndex
                    ? {
                        ...item,
                        quantity:
                          item.original_quantity ??
                          item.quantity,
                        adjusted: false,
                        excluded:
                          item.excluded_by_quantity
                            ? false
                            : item.excluded,
                        excluded_by_quantity:
                          false,
                      }
                    : item,
              ),
            }
          : order,
      ),
    );
  }

  return (
    <div className="vp-work-page sales-billing-workspace mx-auto max-w-[1580px] px-6 py-8 lg:px-10">
      <ProcessStatusOverlay
        open={
          activity === "selecting" ||
          activity === "previewing"
        }
        title={
          activity === "selecting"
            ? "กำลังเปิดหน้าต่างเลือกไฟล์ PDF..."
            : "กำลังอ่าน PDF และจัดคิว IV..."
        }
        description={
          activity === "selecting"
            ? "กรุณาเลือกไฟล์ที่ต้องการนำมาเปิดบิล"
            : "กรุณาอย่าปิดโปรแกรมระหว่างประมวลผล"
        }
      />
      <header className="vp-page-header flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-5 flex items-center gap-2 text-sm text-cyan-700 transition hover:text-cyan-500"
          >
            <ArrowLeft size={17} />
            กลับหน้าแดชบอร์ด
          </button>

          <p className="text-[10px] font-semibold tracking-[0.24em] text-emerald-600">
            SALES BILLING AUTOMATION
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            เปิดบิลขายสินค้า
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            อ่าน PO จัดคิว IV
            ตรวจสอบสินค้า และส่งข้อมูลเข้า
            Express แบบควบคุมได้
          </p>
        </div>
        <div className="vp-page-icon flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-300/50 bg-emerald-50 text-emerald-600">
          <ReceiptText size={23} />
        </div>
      </header>

      <section className="vp-setup-grid mt-7 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void choosePdf();
          }}
          className="vp-setup-card vp-upload-card min-h-32 rounded-2xl border border-cyan-300 bg-gradient-to-br from-white via-cyan-50/70 to-blue-50 p-6 text-left text-slate-900 shadow-[0_12px_30px_rgba(8,145,178,0.12)] transition hover:-translate-y-0.5 hover:border-cyan-400 disabled:opacity-50"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <FileUp
                size={24}
                className="text-cyan-600"
              />
              <h3 className="mt-4 font-semibold">
                อัปโหลดไฟล์ PDF
              </h3>
              <p className="mt-2 break-all text-xs leading-5 text-slate-500">
                {pdfPath ||
                  "เลือกไฟล์รายงาน PO จาก CP ALL"}
              </p>
            </div>
            <span className="rounded-full border border-cyan-200 bg-white px-3 py-1 text-[10px] font-semibold text-cyan-700">
              PDF
            </span>
          </div>
        </button>

        <div className="vp-setup-card rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
          <label className="text-[10px] font-semibold tracking-[0.2em] text-blue-600">
            IV NUMBER เริ่มต้น
          </label>
          <div className="mt-4 flex overflow-hidden rounded-xl border border-blue-200 bg-slate-50">
            <span className="border-r border-blue-200 bg-blue-50 px-4 py-3 font-semibold text-blue-700">
              VPR
            </span>
            <input
              value={startIv}
              disabled={busy}
              onChange={(event) => {
                setStartIv(
                  normalizeIvDigits(
                    event.target.value,
                  ),
                );
                setPreview(null);
              }}
              inputMode="numeric"
              placeholder="6907001"
              className="min-w-0 flex-1 bg-transparent px-4 py-3 font-mono text-slate-800 outline-none"
            />
          </div>
        </div>
      </section>

      {activity !== "previewing" && (
        <div className="vp-action-bar mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={
              busy ||
              !pdfPath ||
              !/^\d+$/.test(startIv)
            }
            onClick={() => {
              void buildPreview();
            }}
            className="vp-action-button vp-action-primary flex min-w-[280px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#063653] to-[#08769a] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-950/15 transition hover:-translate-y-0.5 hover:from-[#075b78] hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileSearch size={18} />
            ประมวลผลและแสดง Preview
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              onNextProcess(
                pdfPath,
              );
            }}
            className="vp-next-process flex min-w-[190px] items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Next Process
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {(error || success) && (
        <div
          className={`mt-5 rounded-xl border px-5 py-4 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || success}
        </div>
      )}

      {preview && (
        <>
          <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="PO ทั้งหมด"
              value={
                preview.summary
                  .orderCount
              }
              tone="cyan"
            />
            <SummaryCard
              label="พร้อมเปิดบิล"
              value={
                orders.filter(
                  isOrderReady,
                ).length
              }
              tone="emerald"
            />
            <SummaryCard
              label="ต้องตรวจสอบ"
              value={
                orders.filter(
                  (order) =>
                    !isOrderReady(order),
                ).length
              }
              tone="amber"
            />
            <SummaryCard
              label="สินค้าที่ส่ง"
              value={orders.reduce(
                (total, order) =>
                  total +
                  order.items.filter(
                    (item) =>
                      !item.excluded,
                  ).length,
                0,
              )}
              tone="blue"
            />
            <SummaryCard
              label="IV ที่เลือก"
              value={
                selectedOrders.length
              }
              tone="violet"
            />
          </section>

          {newProducts.length > 0 && (
            <section className="mt-6 overflow-hidden rounded-2xl border border-amber-300 bg-white shadow-[0_18px_42px_rgba(217,119,6,0.12)]">
              <div className="flex flex-col gap-3 border-b border-amber-200 bg-gradient-to-r from-amber-50 via-white to-cyan-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-600 shadow-sm">
                    <PackagePlus size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-700">
                      NEW PRODUCT DETECTED
                    </p>
                    <h3 className="mt-1 font-semibold text-slate-900">
                      พบสินค้าใหม่ {newProducts.length} รายการ
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      ระบบอ่านข้อมูลจาก PDF ให้แล้ว กรุณากรอกรหัส Express เพียงครั้งเดียว
                    </p>
                  </div>
                </div>
                <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-700">
                  บันทึกถาวรใน ValuePlus Data
                </span>
              </div>

              <div className="grid gap-4 p-5 xl:grid-cols-2">
                {newProducts.map((item) => {
                  const draft =
                    mappingDrafts[item.cpall_code] ??
                    item.express_code;
                  const saving =
                    savingProduct === item.cpall_code;

                  return (
                    <article
                      key={item.cpall_code}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-amber-700">
                            CPALL {item.cpall_code}
                          </p>
                          <h4 className="mt-2 text-sm font-semibold text-slate-900">
                            {item.pdf_name}
                          </h4>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Barcode {item.barcode || "-"} • ราคา {item.unit_price.toLocaleString("th-TH")}
                          </p>
                        </div>
                        {item.match_method === "fuzzy_name" && (
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                            ระบบแนะนำ {item.express_code}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <input
                          value={draft}
                          disabled={saving || busy}
                          onChange={(event) => {
                            setMappingDrafts((current) => ({
                              ...current,
                              [item.cpall_code]: normalizeExpressCodeInput(
                                event.target.value,
                              ),
                            }));
                          }}
                          placeholder="01-0000-00"
                          maxLength={10}
                          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                        />
                        <button
                          type="button"
                          disabled={saving || busy || !draft.trim()}
                          onClick={() => {
                            void saveNewProduct(item);
                          }}
                          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Save size={17} />
                          {saving ? "กำลังบันทึก..." : "บันทึกสินค้า"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="vp-data-card overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm">
              <div className="border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-white px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-cyan-700">
                    IV QUEUE
                  </p>
                  <h3 className="mt-1 font-semibold text-slate-900">
                    คิวเปิดบิลขายสินค้า
                  </h3>
                </div>
              </div>

              <div className="divide-y divide-cyan-100">
                {orders.map(
                  (order, index) => {
                    const expanded =
                      expandedPo ===
                      order.po_number;
                    const ready =
                      isOrderReady(order);
                    return (
                      <article
                        key={
                          order.po_number
                        }
                        className={
                          order.selected ===
                          false
                            ? "bg-slate-50/80 opacity-65"
                            : "bg-white"
                        }
                      >
                        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[42px_minmax(0,1fr)_130px_118px] lg:items-center">
                          <input
                            type="checkbox"
                            checked={
                              ready &&
                              order.selected !==
                              false
                            }
                            disabled={
                              busy ||
                              !ready
                            }
                            onChange={() =>
                              toggleOrder(
                                order.po_number,
                              )
                            }
                            className="h-5 w-5 accent-cyan-600"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPo(
                                expanded
                                  ? null
                                  : order.po_number,
                              )
                            }
                            className="min-w-0 text-left"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-semibold text-blue-700">
                                {
                                  order.iv_number
                                }
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                  ready
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {ready
                                  ? "พร้อม"
                                  : "ตรวจสอบ"}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-sm font-medium text-slate-800">
                              {
                                order.warehouse_group
                              }{" "}
                              {
                                order.warehouse_sequence
                              }{" "}
                              • PO{" "}
                              {
                                order.po_number
                              }
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {
                                order.items.filter(
                                  (item) =>
                                    !item.excluded,
                                ).length
                              }{" "}
                              รายการ • เขตขาย{" "}
                              {
                                order.sales_area_code ||
                                "-"
                              }
                            </p>
                            {order.items.some(
                              (item) =>
                                item.adjusted,
                            ) && (
                              <p className="mt-1 text-[11px] font-semibold text-amber-700">
                                ตัดยอดแล้ว {order.items.filter((item) => item.adjusted).length} รายการ
                              </p>
                            )}
                          </button>
                          <div className="vp-icon-button-group flex items-center gap-3">
                            <button
                              type="button"
                              disabled={
                                busy ||
                                index === 0
                              }
                              onClick={() =>
                                moveOrder(
                                  index,
                                  -1,
                                )
                              }
                              className="rounded-lg border border-cyan-200 p-2 text-cyan-700 disabled:opacity-25"
                              aria-label="เลื่อนขึ้น"
                            >
                              <ArrowUp
                                size={16}
                              />
                            </button>
                            <button
                              type="button"
                              disabled={
                                busy ||
                                index ===
                                  orders.length -
                                    1
                              }
                              onClick={() =>
                                moveOrder(
                                  index,
                                  1,
                                )
                              }
                              className="rounded-lg border border-cyan-200 p-2 text-cyan-700 disabled:opacity-25"
                              aria-label="เลื่อนลง"
                            >
                              <ArrowDown
                                size={16}
                              />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPo(
                                expanded
                                  ? null
                                  : order.po_number,
                              )
                            }
                            className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700"
                          >
                            <PackageMinus
                              size={15}
                            />
                            ตัดยอด
                            {expanded ? (
                              <ChevronUp
                                size={15}
                              />
                            ) : (
                              <ChevronDown
                                size={15}
                              />
                            )}
                          </button>
                        </div>

                        {expanded && (
                          <div className="border-t border-cyan-100 bg-slate-50/70 px-4 py-3">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                              <div>
                                <p className="text-sm font-semibold text-amber-900">
                                  ตัดยอดรายสินค้า • {order.warehouse_group} {order.warehouse_sequence}
                                </p>
                                <p className="mt-1 text-[11px] text-amber-700">
                                  กรอกยอดคงเหลือที่ต้องการส่งเข้า Express — ใส่ 0 เพื่อไม่ส่งรายการนั้น
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {order.items.map(
                                (
                                  item,
                                  itemIndex,
                                ) => (
                                  <div
                                    key={`${item.cpall_code}-${itemIndex}`}
                                    className={`grid gap-3 rounded-xl border bg-white p-3 sm:grid-cols-[minmax(0,1fr)_170px_110px] sm:items-center ${
                                      item.adjusted
                                        ? "border-amber-300 ring-1 ring-amber-100"
                                        : "border-slate-200"
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-slate-800">
                                        {
                                          item.pdf_name
                                        }
                                      </p>
                                      <p className="mt-1 text-[11px] text-slate-500">
                                        Express{" "}
                                        {
                                          item.express_code ||
                                          "ไม่พบรหัส"
                                        }{" "}
                                        • ราคา{" "}
                                        {item.unit_price.toLocaleString()}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-semibold text-slate-500">
                                        ยอดคงเหลือ
                                      </label>
                                      <div className="mt-1 flex items-center gap-2">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={item.quantity}
                                          disabled={busy}
                                          onFocus={(event) => event.currentTarget.select()}
                                          onChange={(event) =>
                                            setItemQuantity(
                                              order.po_number,
                                              itemIndex,
                                              Number(event.target.value),
                                            )
                                          }
                                          className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-right font-mono font-semibold text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                                        />
                                        {item.adjusted && (
                                          <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => restoreItemQuantity(order.po_number, itemIndex)}
                                            className="rounded-lg border border-slate-200 px-2 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                                            title="คืนยอดเดิม"
                                          >
                                            คืนค่า
                                          </button>
                                        )}
                                      </div>
                                      <p className="mt-1 text-right text-[10px] text-slate-400">
                                        เดิม {(item.original_quantity ?? item.quantity).toLocaleString()}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() =>
                                        toggleItem(
                                          order.po_number,
                                          itemIndex,
                                        )
                                      }
                                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                                        item.excluded
                                          ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                                          : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                      }`}
                                    >
                                      {item.excluded
                                        ? "ไม่ส่งสินค้า"
                                        : "ส่งสินค้า"}
                                    </button>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  },
                )}
              </div>
            </section>

            <aside className="vp-live-monitor sticky top-5 overflow-hidden rounded-2xl border border-cyan-300 bg-white shadow-[0_16px_40px_rgba(8,145,178,0.14)]">
              <div className="vp-live-monitor-header border-b border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-5 text-slate-900">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.2em] text-cyan-700">
                      LIVE MONITOR
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">
                      สถานะเปิดบิล
                    </h3>
                  </div>
                  <MonitorDot className="text-cyan-600" />
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-cyan-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-400 transition-all"
                    style={{
                      width: `${currentPercent}%`,
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>
                    {activity ===
                    "running"
                      ? "กำลังทำงาน"
                      : "พร้อมเริ่ม"}
                  </span>
                  <span>
                    {currentPercent}%
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <MonitorField
                  label="IV ปัจจุบัน"
                  value={
                    progress?.ivNumber ??
                    "-"
                  }
                />
                <MonitorField
                  label="ขั้นตอน"
                  value={
                    progress?.step ??
                    "รอเริ่มงาน"
                  }
                />
                <MonitorField
                  label="รายละเอียด"
                  value={
                    progress?.detail ??
                    `${selectedOrders.length} IV ในคิว`
                  }
                />

                {activity ===
                "running" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        void sendControl(
                          paused
                            ? "RESUME"
                            : "PAUSE",
                        );
                      }}
                      className="vp-control-pause flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-3 text-xs font-semibold text-white"
                    >
                      {paused ? (
                        <CirclePlay
                          size={17}
                        />
                      ) : (
                        <CirclePause
                          size={17}
                        />
                      )}
                      {paused
                        ? "ทำต่อ"
                        : "พักหลัง IV นี้"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void sendControl(
                          "STOP",
                        );
                      }}
                      className="vp-control-stop flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-3 text-xs font-semibold text-white"
                    >
                      <Octagon
                        size={17}
                      />
                      หยุด
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={
                      selectedOrders.length ===
                      0
                    }
                    onClick={() => {
                      void runBilling();
                    }}
                    className="vp-run-button flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Play size={18} />
                    ยืนยันเปิดบิลจริง
                  </button>
                )}

                <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-3 text-[11px] leading-5 text-slate-600">
                  <CheckCircle2
                    size={15}
                    className="mb-2 text-emerald-600"
                  />
                  โหมดจริงต้องเปิด Express
                  ที่หน้า IV
                  และห้ามใช้เมาส์หรือคีย์บอร์ดระหว่างระบบทำงาน
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-500">
                    ปุ่มลัดควบคุม EXPRESS
                  </p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600">
                    <HotkeyHint
                      hotkey="F12"
                      label="หยุดการคีย์ทันที"
                      tone="red"
                    />
                    <HotkeyHint
                      hotkey="Pause / Break"
                      label="จบ IV ปัจจุบันแล้วพัก"
                      tone="amber"
                    />
                    <HotkeyHint
                      hotkey="Insert"
                      label="ทำงานต่อจาก Pause"
                      tone="emerald"
                    />
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function isOrderReady(
  order: SalesBillingOrder,
): boolean {
  const items = order.items.filter(
    (item) => !item.excluded,
  );
  return Boolean(
    order.po_number &&
      order.express_date &&
      order.sales_area_code &&
      items.length > 0 &&
      items.every((item) => item.match_status === "matched"),
  );
}

function normalizeExpressCodeInput(
  value: string,
): string {
  const digits = value
    .toUpperCase()
    .replace(/[^0-9]/g, "")
    .slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
}

function normalizeExpressCode(
  value: string,
): string {
  return normalizeExpressCodeInput(
    value,
  );
}

function normalizeIvDigits(
  value: string,
): string {
  return value
    .toUpperCase()
    .replace(/^VPR/, "")
    .replace(/\D/g, "");
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone:
    | "cyan"
    | "emerald"
    | "amber"
    | "blue"
    | "violet";
}) {
  const colors = {
    cyan: "border-cyan-200 text-cyan-700",
    emerald:
      "border-emerald-200 text-emerald-700",
    amber:
      "border-amber-200 text-amber-700",
    blue: "border-blue-200 text-blue-700",
    violet:
      "border-violet-200 text-violet-700",
  };
  return (
    <div
      className={`vp-summary-card rounded-xl border bg-white px-5 py-4 shadow-sm ${colors[tone]}`}
    >
      <p className="text-xs text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function MonitorField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-cyan-100 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-semibold tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function HotkeyHint({
  hotkey,
  label,
  tone,
}: {
  hotkey: string;
  label: string;
  tone:
    | "red"
    | "amber"
    | "emerald";
}) {
  const toneClass = {
    red: "border-red-200 bg-red-50 text-red-700",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
      <span>{label}</span>

      <kbd
        className={`min-w-20 rounded-lg border px-2.5 py-1.5 text-center font-mono text-[11px] font-semibold shadow-sm ${toneClass}`}
      >
        {hotkey}
      </kbd>
    </div>
  );
}

function getErrorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : String(error);
}
