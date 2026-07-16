import { useState } from "react";
import {
  LoaderCircle,
  Save,
  X,
} from "lucide-react";

import type {
  NewPoInput,
  PoRecord,
} from "./poData.types";

interface EditPoModalProps {
  record: PoRecord;
  saving?: boolean;
  onClose: () => void;
  onSave: (
    id: string,
    input: NewPoInput,
  ) => void;
}

export function EditPoModal({
  record,
  saving = false,
  onClose,
  onSave,
}: EditPoModalProps) {
  const [form, setForm] =
    useState<NewPoInput>({
      poNumber: record.poNumber,
      ivNumber: record.ivNumber,
      documentDate:
        record.documentDate,
      reference:
        record.reference || "",
      customerName:
        record.customerName || "",
      assignee:
        record.assignee || "",
    });

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

    onSave(record.id, {
      ...form,
      poNumber:
        form.poNumber
          .trim()
          .toUpperCase(),
      ivNumber:
        form.ivNumber
          .trim()
          .toUpperCase(),
      reference:
        form.reference.trim(),
      customerName:
        form.customerName.trim(),
      assignee:
        form.assignee.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
      <section className="w-full max-w-3xl rounded-2xl border border-cyan-300/20 bg-[#061525] shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-cyan-300">
              EDIT PO RECORD
            </p>

            <h3 className="mt-1 text-xl font-semibold">
              แก้ไขรายการ PO
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
          <EditInput
            label="PO Number"
            value={form.poNumber}
            onChange={(value) =>
              updateForm(
                "poNumber",
                value,
              )
            }
          />

          <EditInput
            label="IV Number"
            value={form.ivNumber}
            onChange={(value) =>
              updateForm(
                "ivNumber",
                value,
              )
            }
          />

          <EditInput
            label="Date"
            type="date"
            value={
              form.documentDate
            }
            onChange={(value) =>
              updateForm(
                "documentDate",
                value,
              )
            }
          />

          <EditInput
            label="Reference"
            value={form.reference}
            onChange={(value) =>
              updateForm(
                "reference",
                value,
              )
            }
          />

          <EditInput
            label="Customer name"
            value={
              form.customerName
            }
            onChange={(value) =>
              updateForm(
                "customerName",
                value,
              )
            }
          />

          <EditInput
            label="Assignee"
            value={form.assignee}
            onChange={(value) =>
              updateForm(
                "assignee",
                value,
              )
            }
          />
        </div>

        <footer className="flex justify-end gap-3 border-t border-white/[0.06] px-6 py-5">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-400 disabled:opacity-40"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="flex min-w-36 items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-2.5 text-sm text-cyan-200 disabled:opacity-50"
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
              : "บันทึกการแก้ไข"}
          </button>
        </footer>
      </section>
    </div>
  );
}

interface EditInputProps {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}

function EditInput({
  label,
  value,
  type = "text",
  onChange,
}: EditInputProps) {
  return (
    <label>
      <span className="mb-2 block text-xs text-slate-400">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="h-11 w-full rounded-xl border border-slate-700/70 bg-[#020b16] px-4 text-sm text-white outline-none focus:border-cyan-300/40"
      />
    </label>
  );
}