import { useState } from "react";
import {
  LoaderCircle,
  Save,
  X,
} from "lucide-react";

import type { NewPoInput } from "./poData.types";

interface CreatePoModalProps {
  saving?: boolean;
  onClose: () => void;
  onSave: (input: NewPoInput) => void;
}

const initialForm: NewPoInput = {
  poNumber: "",
  ivNumber: "",
  documentDate: new Date()
    .toISOString()
    .slice(0, 10),
  reference: "",
  customerName: "",
  assignee: "",
};

export function CreatePoModal({
  saving = false,
  onClose,
  onSave,
}: CreatePoModalProps) {
  const [form, setForm] =
    useState(initialForm);

  const updateForm = (
    field: keyof NewPoInput,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = () => {
    if (
      !form.poNumber.trim() ||
      !form.ivNumber.trim() ||
      !form.documentDate ||
      !form.customerName.trim()
    ) {
      window.alert(
        "กรุณากรอก PO, IV, วันที่ และชื่อลูกค้าให้ครบ",
      );
      return;
    }

    onSave({
      ...form,
      poNumber: form.poNumber
        .trim()
        .toUpperCase(),

      ivNumber: form.ivNumber
        .trim()
        .toUpperCase(),

      reference: form.reference.trim(),
      customerName:
        form.customerName.trim(),

      assignee: form.assignee.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
      <section className="w-full max-w-3xl rounded-2xl border border-cyan-300/20 bg-[#061525] shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-emerald-300">
              CREATE PO RECORD
            </p>

            <h3 className="mt-1 text-xl font-semibold">
              เพิ่มรายการ PO
            </h3>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="text-slate-500 transition hover:text-white disabled:opacity-30"
          >
            <X size={21} />
          </button>
        </header>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          <FormInput
            label="PO Number"
            value={form.poNumber}
            placeholder="เช่น 6907012"
            onChange={(value) =>
              updateForm("poNumber", value)
            }
          />

          <FormInput
            label="IV Number"
            value={form.ivNumber}
            placeholder="เช่น VPR6907001"
            onChange={(value) =>
              updateForm("ivNumber", value)
            }
          />

          <FormInput
            label="Date"
            type="date"
            value={form.documentDate}
            onChange={(value) =>
              updateForm(
                "documentDate",
                value,
              )
            }
          />

          <FormInput
            label="Reference"
            value={form.reference}
            placeholder="เลขอ้างอิงหรือรายละเอียดอ้างอิง"
            onChange={(value) =>
              updateForm("reference", value)
            }
          />

          <FormInput
            label="Customer name"
            value={form.customerName}
            placeholder="ชื่อลูกค้า"
            onChange={(value) =>
              updateForm(
                "customerName",
                value,
              )
            }
          />

          <FormInput
            label="Assignee"
            value={form.assignee}
            placeholder="ผู้รับผิดชอบ"
            onChange={(value) =>
              updateForm("assignee", value)
            }
          />
        </div>

        <footer className="vp-modal-actions flex justify-end gap-3 border-t border-white/[0.06] px-6 py-5">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-400 transition hover:text-white disabled:opacity-40"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="flex min-w-36 items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-2.5 text-sm text-emerald-200 transition hover:bg-emerald-300/15 disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            ) : (
              <Save size={17} />
            )}

            {saving
              ? "กำลังบันทึก..."
              : "บันทึกรายการ"}
          </button>
        </footer>
      </section>
    </div>
  );
}

interface FormInputProps {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}

function FormInput({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: FormInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs text-slate-400">
        {label}
      </span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full rounded-xl border border-slate-700/70 bg-[#020b16] px-4 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/40"
      />
    </label>
  );
}
