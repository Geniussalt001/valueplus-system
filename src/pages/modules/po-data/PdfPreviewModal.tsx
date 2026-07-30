import { ExternalLink, X } from "lucide-react";

interface PdfPreviewModalProps {
  fileName: string;
  fileUrl: string;
  onClose: () => void;
}

export function PdfPreviewModal({
  fileName,
  fileUrl,
  onClose,
}: PdfPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#020812]/95 backdrop-blur-xl">
      <header className="flex h-16 items-center justify-between border-b border-cyan-300/10 px-6">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-cyan-300">
            PDF PREVIEW
          </p>

          <p className="mt-1 max-w-xl truncate text-sm text-white">
            {fileName}
          </p>
        </div>

        <div className="flex gap-3">
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-300"
          >
            <ExternalLink size={18} />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-red-300/40 hover:text-red-300"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      <iframe
        title={fileName}
        src={fileUrl}
        className="h-[calc(100vh-4rem)] w-full border-0 bg-white"
      />
    </div>
  );
}
