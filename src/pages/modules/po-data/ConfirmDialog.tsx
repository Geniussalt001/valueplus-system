import {
  AlertTriangle,
  LoaderCircle,
  X,
} from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmText: string;
  processing?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmText,
  processing = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-2xl border border-red-300/25 bg-[#100a12] shadow-[0_35px_100px_rgba(0,0,0,0.7)]">
        <header className="flex items-center justify-between border-b border-red-300/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-300/20 bg-red-300/10">
              <AlertTriangle
                size={21}
                className="text-red-300"
              />
            </div>

            <h3 className="text-lg font-semibold text-white">
              {title}
            </h3>
          </div>

          <button
            type="button"
            disabled={processing}
            onClick={onCancel}
            className="text-slate-500 transition hover:text-white disabled:opacity-30"
          >
            <X size={20} />
          </button>
        </header>

        <div className="px-6 py-6">
          <p className="text-sm leading-7 text-slate-400">
            {description}
          </p>

          <p className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-4 py-3 text-xs leading-6 text-amber-200">
            ข้อมูลจะถูกย้ายไป PO_TRASH และ PDF จะถูกย้ายไปถังขยะ Google Drive
          </p>
        </div>

        <footer className="vp-modal-actions flex justify-end gap-3 border-t border-red-300/10 px-6 py-5">
          <button
            type="button"
            disabled={processing}
            onClick={onCancel}
            className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-400 transition hover:text-white disabled:opacity-40"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            disabled={processing}
            onClick={onConfirm}
            className="flex min-w-32 items-center justify-center gap-2 rounded-xl border border-red-300/30 bg-red-300/10 px-5 py-2.5 text-sm text-red-200 transition hover:bg-red-300/15 disabled:cursor-wait disabled:opacity-60"
          >
            {processing && (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            )}

            {processing
              ? "กำลังดำเนินการ..."
              : confirmText}
          </button>
        </footer>
      </section>
    </div>
  );
}
