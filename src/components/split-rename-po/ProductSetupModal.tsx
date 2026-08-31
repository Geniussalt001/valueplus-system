import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PackagePlus, Save, X } from "lucide-react";

import type { PoProductMatch } from "../../types/poProcessor.types";

export interface ProductSetupForm {
  cpallCode: string;
  expressCode: string;
  templateName: string;
  displayName: string;
  lineName: string;
  price: string;
}

interface ProductSetupModalProps {
  item: PoProductMatch | null;
  productNames: string[];
  saving: boolean;
  onClose: () => void;
  onSave: (form: ProductSetupForm) => void;
}

export function ProductSetupModal({
  item,
  productNames,
  saving,
  onClose,
  onSave,
}: ProductSetupModalProps) {
  const [form, setForm] = useState<ProductSetupForm>({
    cpallCode: "",
    expressCode: "",
    templateName: "",
    displayName: "",
    lineName: "",
    price: "",
  });

  useEffect(() => {
    if (!item) return;
    setForm({
      cpallCode: item.cpall_code || (item.barcode.length === 7 ? item.barcode : ""),
      expressCode: "",
      templateName: item.target_name || item.data_name || "",
      displayName: item.data_name || item.pdf_name,
      lineName: item.data_name || item.pdf_name,
      price: "",
    });
  }, [item]);

  if (!item) return null;

  const parsedPrice = form.price.trim() ? Number(form.price) : undefined;
  const validPrice = parsedPrice === undefined || (
    Number.isFinite(parsedPrice) && parsedPrice >= 0
  );
  const valid =
    /^\d{7}$/.test(form.cpallCode) &&
    /^\d{2}-\d{4}-\d{2}$/.test(form.expressCode) &&
    Boolean(form.templateName && form.displayName.trim()) &&
    validPrice;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 bg-gradient-to-r from-cyan-50 to-blue-50 px-6 py-5">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-600 text-white"><PackagePlus size={22} /></div>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-cyan-700">NEW PRODUCT SETUP</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">ตั้งค่าสินค้าใหม่ครั้งเดียว</h3>
              <p className="mt-1 text-xs text-slate-500">{item.pdf_name}</p>
            </div>
          </div>
          <button type="button" disabled={saving} onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-white"><X size={19} /></button>
        </header>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <Field label="รหัส CPALL 7 หลัก">
            <input value={form.cpallCode} maxLength={7} onChange={(e) => setForm({ ...form, cpallCode: e.target.value.replace(/\D/g, "") })} className="vp-product-input" placeholder="6000000" />
          </Field>
          <Field label="รหัสสินค้า Express">
            <input value={form.expressCode} maxLength={10} onChange={(e) => setForm({ ...form, expressCode: formatExpressCode(e.target.value) })} className="vp-product-input font-mono" placeholder="01-0000-00" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="จับคู่กับชื่อใน Template ใบจัด">
              <select value={form.templateName} onChange={(e) => {
                const templateName = e.target.value;
                setForm({ ...form, templateName, displayName: form.displayName || templateName, lineName: form.lineName || templateName });
              }} className="vp-product-input">
                <option value="">เลือกสินค้าที่ถูกต้อง</option>
                {productNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="ชื่อมาตรฐานสำหรับหน้าสรุปยอด">
            <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="vp-product-input" />
          </Field>
          <Field label="ชื่อสั้นสำหรับ LINE/รายงาน">
            <input value={form.lineName} onChange={(e) => setForm({ ...form, lineName: e.target.value })} className="vp-product-input" />
          </Field>
          <Field label="ราคาต่อหน่วย (เว้นว่างได้)">
            <input value={form.price} inputMode="decimal" onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d.]/g, "") })} className="vp-product-input" placeholder="0.00" />
          </Field>
          <div className="flex items-end text-xs leading-5 text-slate-500">บันทึกครั้งเดียวให้ใบจัด, Daily SO, เปิดบิล Express และหน้าสรุปยอด</div>
        </div>

        <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700">ยกเลิก</button>
          <button type="button" disabled={saving || !valid} onClick={() => onSave(form)} className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Save size={17} />{saving ? "กำลังบันทึก..." : "บันทึกและจับคู่"}</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-700"><span className="mb-2 block">{label}</span>{children}</label>;
}

function formatExpressCode(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6, 8)].filter(Boolean).join("-");
}
