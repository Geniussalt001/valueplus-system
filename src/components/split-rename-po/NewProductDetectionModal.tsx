import {
  AlertTriangle,
  PackagePlus,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import type {
  PoDetectedNewProduct,
  PoTemplateProductInput,
} from "../../types/poProcessor.types";

interface NewProductDetectionModalProps {
  open: boolean;
  products: PoDetectedNewProduct[];
  disabled: boolean;
  onClose: () => void;
  onSave: (
    products: PoTemplateProductInput[],
  ) => void;
}

export function NewProductDetectionModal({
  open,
  products,
  disabled,
  onClose,
  onSave,
}: NewProductDetectionModalProps) {
  const [drafts, setDrafts] =
    useState<PoDetectedNewProduct[]>([]);

  useEffect(() => {
    if (open) {
      setDrafts(
        products.map((product) => ({
          ...product,
        })),
      );
    }
  }, [open, products]);

  const valid = useMemo(
    () => {
      const names = drafts.map(
        (product) =>
          normalizeField(
            product.savedName,
          ),
      );

      const codes = drafts.map(
        (product) =>
          normalizeField(
            product.productCode,
          ),
      );

      return (
        drafts.length > 0 &&
        drafts.every(
        (product) =>
          Boolean(product.savedName.trim()) &&
          Boolean(product.productCode.trim()) &&
          product.packQuantity !== null &&
          Number.isFinite(product.packQuantity) &&
          product.packQuantity > 0,
        ) &&
        new Set(names).size === names.length &&
        new Set(codes).size === codes.length
      );
    },
    [drafts],
  );

  if (!open) {
    return null;
  }

  function updateDraft(
    index: number,
    patch: Partial<PoDetectedNewProduct>,
  ) {
    setDrafts((current) =>
      current.map((product, productIndex) =>
        productIndex === index
          ? {
              ...product,
              ...patch,
            }
          : product,
      ),
    );
  }

  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[10020]
        flex
        items-center
        justify-center
        overflow-y-auto
        bg-slate-950/45
        p-4
        backdrop-blur-sm
      "
      role="dialog"
      aria-modal="true"
      aria-label="ตรวจสอบสินค้าใหม่"
    >
      <div
        className="
          flex
          max-h-[calc(100vh-2rem)]
          w-full
          max-w-4xl
          flex-col
          overflow-hidden
          rounded-3xl
          border
          border-amber-200
          bg-white
          shadow-2xl
        "
      >
        <header
          className="
            flex
            items-start
            justify-between
            gap-4
            border-b
            border-amber-100
            bg-gradient-to-r
            from-amber-50
            via-white
            to-rose-50
            px-6
            py-5
          "
        >
          <div className="flex gap-4">
            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-amber-200
                bg-amber-100
                text-amber-700
              "
            >
              <PackagePlus size={22} />
            </div>

            <div>
              <p
                className="
                  text-[10px]
                  font-semibold
                  tracking-[0.2em]
                  text-rose-600
                "
              >
                NEW PRODUCT DETECTED
              </p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">
                พบสินค้าใหม่ {drafts.length} รายการ
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                ตรวจและแก้ชื่อ รหัส และจำนวนบรรจุก่อนเพิ่มลง Template
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              bg-white
              text-slate-500
              transition
              hover:border-rose-300
              hover:text-rose-600
              disabled:opacity-40
            "
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} />
          </button>
        </header>

        <div className="overflow-y-auto bg-slate-50/70 p-5">
          <div
            className="
              mb-4
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-amber-200
              bg-amber-50
              px-4
              py-3
              text-xs
              leading-5
              text-amber-800
            "
          >
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <p>
              ชื่อจาก PDF มีไว้ให้เปรียบเทียบเท่านั้น ช่อง “ชื่อที่จะบันทึก” แก้ได้เต็มที่
              ระบบจะไม่แตะ Template จนกว่าจะกดบันทึก
            </p>
          </div>

          <div className="space-y-4">
            {drafts.map((product, index) => (
              <article
                key={`${product.detectedName}-${index}`}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    สินค้าใหม่ #{index + 1}
                  </p>
                  <span
                    className="
                      rounded-full
                      border
                      border-amber-200
                      bg-amber-50
                      px-2.5
                      py-1
                      text-[10px]
                      font-semibold
                      text-amber-700
                    "
                  >
                    รอการยืนยัน
                  </span>
                </div>

                <label className="block text-xs font-semibold text-slate-600">
                  ชื่อที่ระบบอ่านจาก PDF
                  <div
                    className="
                      mt-2
                      rounded-xl
                      border
                      border-slate-200
                      bg-slate-100
                      px-4
                      py-3
                      font-normal
                      text-slate-600
                    "
                  >
                    {product.detectedName}
                  </div>
                </label>

                <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_150px]">
                  <label className="text-xs font-semibold text-slate-700">
                    ชื่อที่จะบันทึก
                    <input
                      type="text"
                      value={product.savedName}
                      disabled={disabled}
                      onChange={(event) =>
                        updateDraft(index, {
                          savedName: event.target.value,
                        })
                      }
                      className="
                        mt-2
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-sky-200
                        bg-white
                        px-3
                        text-sm
                        font-medium
                        text-slate-900
                        outline-none
                        transition
                        focus:border-sky-400
                        focus:ring-2
                        focus:ring-sky-100
                      "
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-700">
                    รหัสสินค้า
                    <input
                      type="text"
                      value={product.productCode}
                      disabled={disabled}
                      onChange={(event) =>
                        updateDraft(index, {
                          productCode: event.target.value,
                        })
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-sky-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-700">
                    จำนวนบรรจุ
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={product.packQuantity ?? ""}
                      disabled={disabled}
                      onChange={(event) =>
                        updateDraft(index, {
                          packQuantity:
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                        })
                      }
                      placeholder="เช่น 63"
                      className="mt-2 h-11 w-full rounded-xl border border-sky-200 bg-white px-3 text-right text-sm font-semibold text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </div>

        <footer
          className="
            flex
            flex-col
            gap-3
            border-t
            border-slate-200
            bg-white
            px-6
            py-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck size={16} className="text-emerald-600" />
            ระบบจะสำรอง Template เดิมก่อนบันทึกทุกครั้ง
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={disabled}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              ตรวจเองภายหลัง
            </button>
            <button
              type="button"
              disabled={disabled || !valid}
              onClick={() =>
                onSave(
                  drafts.map((product) => ({
                    name: product.savedName.trim(),
                    productCode: product.productCode.trim(),
                    packQuantity: product.packQuantity as number,
                  })),
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-700 bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-700/20 transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save size={17} />
              บันทึกและตรวจใหม่
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function normalizeField(
  value: string,
): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .replace(/\s+/g, "")
    .trim();
}
