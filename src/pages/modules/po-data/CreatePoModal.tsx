import { useState } from "react";
import { Save, X } from "lucide-react";
import type { NewPoInput } from "./poData.types";

interface CreatePoModalProps {
  onClose: () => void;
  onSave: (input: NewPoInput) => void;
}

const initialForm: NewPoInput = {
  ivNumber: "",
  poNumber: "",
  documentDate: new Date().toISOString().slice(0, 10),
  assignee: "",
  branch: "",
};

export function CreatePoModal({
  onClose,
  onSave,
}: CreatePoModalProps) {
  const [form, setForm] = useState(initialForm);

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
      !form.ivNumber.trim() ||
      !form.poNumber.trim() ||
      !form.documentDate
    ) {
      window.alert("กรุณากรอก IV, PO และวันที่ให้ครบ");
      return;
    }

    onSave({
      ...form,
      ivNumber: form.ivNumber.trim().toUpperCase(),
      poNumber: form.poNumber.trim().toUpperCase(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
      <section className="w-full max-w-2xl rounded-2xl border border-cyan-300/20 bg-[#061525] shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
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
            onClick={onClose}
            className="text-slate-500 transition hover:text-white"
          >
            <X size={21} />
          </button>
        </header>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          <FormInput
            label="เลขที่ IV"
            value={form.ivNumber}
            placeholder="เช่น IV26070001"
            onChange={(value) =>
              updateForm("ivNumber", value)
            }
          />

          <FormInput
            label="เลขที่ PO"
            value={form.poNumber}
            placeholder="เช่น B012700170"
            onChange={(value) =>
              updateForm("poNumber", value)
            }
          />

          <FormInput
            label="วันที่เอกสาร"
            type="date"
            value={form.documentDate}
            onChange={(value) =>
              updateForm("documentDate", value)
            }
          />

          <FormInput
            label="สาขา/คลัง"
            value={form.branch}
            placeholder="เช่น มหาชัย"
            onChange={(value) =>
              updateForm("branch", value)
            }
          />

          <div className="md:col-span-2">
            <FormInput
              label="ผู้รับผิดชอบ"
              value={form.assignee}
              placeholder="ชื่อหรือแผนกที่รับผิดชอบ"
              onChange={(value) =>
                updateForm("assignee", value)
              }
            />
          </div>
        </div>

        <footer className="flex justify-end gap-3 border-t border-white/[0.06] px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-400 transition hover:text-white"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={submit}
            className="flex items-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-2.5 text-sm text-emerald-200 transition hover:bg-emerald-300/15"
          >
            <Save size={17} />
            บันทึกรายการ
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