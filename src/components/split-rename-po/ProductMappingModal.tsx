import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Link2, Search, Save, X } from "lucide-react";

import type { PoProductMatch } from "../../types/poProcessor.types";

interface ProductMappingModalProps {
  open: boolean;
  products: PoProductMatch[];
  productNames: string[];
  saving: boolean;
  onClose: () => void;
  onSave: (item: PoProductMatch, templateName: string) => Promise<void>;
}

export function ProductMappingModal({
  open,
  products,
  productNames,
  saving,
  onClose,
  onSave,
}: ProductMappingModalProps) {
  const [sourceQuery, setSourceQuery] = useState("");
  const [targetQuery, setTargetQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const filteredProducts = useMemo(() => {
    const query = sourceQuery.trim().toLocaleLowerCase("th");
    if (!query) return products;
    return products.filter((item) =>
      [item.pdf_name, item.barcode, item.cpall_code, item.target_name ?? ""]
        .some((value) => value.toLocaleLowerCase("th").includes(query)),
    );
  }, [products, sourceQuery]);

  const filteredNames = useMemo(() => {
    const query = targetQuery.trim().toLocaleLowerCase("th");
    return productNames
      .filter((name) => !query || name.toLocaleLowerCase("th").includes(query))
      .slice(0, 120);
  }, [productNames, targetQuery]);

  useEffect(() => {
    if (!open) return;
    const firstUnmatched = products.find((item) => !item.matched) ?? products[0];
    setSelectedKey(firstUnmatched ? productKey(firstUnmatched) : "");
    setSelectedTemplate(firstUnmatched?.target_name ?? firstUnmatched?.data_name ?? "");
    setTargetQuery("");
  }, [open, products]);

  if (!open) return null;

  const selectedItem = products.find((item) => productKey(item) === selectedKey) ?? null;

  function chooseProduct(item: PoProductMatch) {
    setSelectedKey(productKey(item));
    setSelectedTemplate(item.target_name ?? item.data_name ?? "");
    setTargetQuery("");
  }

  return createPortal(
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50 via-cyan-50 to-white px-6 py-5">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <Link2 size={22} />
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-blue-700">PRODUCT MATCHING</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">จับคู่สินค้าเอง</h3>
              <p className="mt-1 text-xs text-slate-500">เลือกชื่อจาก PDF แล้วเชื่อมกับชื่อสินค้าใน Template ระบบจะจำไว้ใช้ครั้งถัดไป</p>
            </div>
          </div>
          <button type="button" disabled={saving} onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-900">
            <X size={19} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50/80 p-5 lg:border-b-0 lg:border-r">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={sourceQuery}
                onChange={(event) => setSourceQuery(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                placeholder="ค้นหาชื่อสินค้า หรือ Barcode"
              />
            </label>
            <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {filteredProducts.map((item) => {
                const active = productKey(item) === selectedKey;
                return (
                  <button
                    key={productKey(item)}
                    type="button"
                    onClick={() => chooseProduct(item)}
                    className={`w-full rounded-xl border p-3 text-left transition ${active ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-300"}`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">{item.pdf_name}</span>
                        <span className="mt-1 block text-[11px] text-slate-500">Barcode {item.barcode || "-"}</span>
                      </span>
                      {item.matched ? <CheckCircle2 className="shrink-0 text-emerald-500" size={18} /> : <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">ยังไม่จับคู่</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex min-h-0 flex-col p-5">
            {selectedItem ? (
              <>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-blue-600">สินค้าจากไฟล์ PDF</p>
                  <p className="mt-2 font-semibold text-slate-900">{selectedItem.pdf_name}</p>
                  <p className="mt-1 text-xs text-slate-500">เลือกสินค้าที่ตรงกันจากรายการด้านล่าง</p>
                </div>

                <label className="relative mt-4 block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    value={targetQuery}
                    onChange={(event) => setTargetQuery(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                    placeholder="ค้นหาชื่อสินค้าใน Template"
                  />
                </label>

                <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {filteredNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedTemplate(name)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${selectedTemplate === name ? "border-cyan-500 bg-cyan-50 font-semibold text-cyan-900" : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300"}`}
                    >
                      <span>{name}</span>
                      {selectedTemplate === name && <CheckCircle2 className="shrink-0 text-cyan-600" size={18} />}
                    </button>
                  ))}
                  {filteredNames.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">ไม่พบสินค้าใน Template ที่ตรงกับคำค้น</div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500">ไม่พบสินค้าจากไฟล์ PDF</div>
            )}
          </section>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">การจับคู่จะถูกบันทึกด้วยชื่อสินค้าและ Barcode โดยไม่แก้ไขไฟล์ Template</p>
          <div className="flex justify-end gap-3">
            <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700">ปิด</button>
            <button
              type="button"
              disabled={saving || !selectedItem || !selectedTemplate}
              onClick={() => selectedItem && void onSave(selectedItem, selectedTemplate)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save size={17} />
              {saving ? "กำลังบันทึก..." : "บันทึกการจับคู่"}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function productKey(item: PoProductMatch): string {
  return `${item.barcode}|${item.pdf_name}`;
}
