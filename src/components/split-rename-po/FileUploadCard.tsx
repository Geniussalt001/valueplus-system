import {
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
} from "lucide-react";

interface FileUploadCardProps {
  kind:
    | "pdf"
    | "excel";

  title: string;
  description: string;
  path: string;
  disabled?: boolean;
  onSelect: () => void;
}

export function FileUploadCard({
  kind,
  title,
  description,
  path,
  disabled = false,
  onSelect,
}: FileUploadCardProps) {
  const Icon =
    kind === "pdf"
      ? FileText
      : FileSpreadsheet;

  const fileName =
    getFileName(
      path,
    );

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="
        group
        min-h-44
        rounded-2xl
        border
        border-sky-200
        bg-gradient-to-br
        from-white
        via-white
        to-cyan-50
        p-5
        text-left
        shadow-sm
        shadow-sky-950/5
        transition
        hover:-translate-y-0.5
        hover:border-cyan-400
        hover:shadow-lg
        hover:shadow-cyan-900/10
        disabled:cursor-wait
        disabled:opacity-60
      "
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-xl
            border
            border-cyan-200
            bg-cyan-50
            text-sky-600
            shadow-sm
          "
        >
          <Icon size={23} />
        </span>

        {path ? (
          <CheckCircle2
            size={20}
            className="text-emerald-500"
          />
        ) : (
          <FolderOpen
            size={20}
            className="
              text-slate-400
              transition
              group-hover:text-sky-600
            "
          />
        )}
      </div>

      <p className="mt-5 font-semibold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>

      <p
        className={`
          mt-4
          truncate
          text-xs
          ${
            path
              ? "font-medium text-emerald-600"
              : "text-slate-400"
          }
        `}
        title={path}
      >
        {fileName ||
          "ยังไม่ได้เลือกไฟล์"}
      </p>
    </button>
  );
}

function getFileName(
  path: string,
): string {
  if (!path) {
    return "";
  }

  const parts =
    path.split(
      /[\\/]/,
    );

  return (
    parts[
      parts.length - 1
    ] || path
  );
}
