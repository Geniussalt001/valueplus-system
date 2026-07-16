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
        border-cyan-300/15
        bg-[#061524]/80
        p-5
        text-left
        transition
        hover:-translate-y-0.5
        hover:border-cyan-300/35
        hover:bg-cyan-300/[0.06]
        disabled:cursor-wait
        disabled:opacity-50
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
            border-cyan-300/20
            bg-cyan-300/[0.07]
            text-cyan-300
          "
        >
          <Icon size={23} />
        </span>

        {path ? (
          <CheckCircle2
            size={20}
            className="text-emerald-300"
          />
        ) : (
          <FolderOpen
            size={20}
            className="
              text-slate-500
              transition
              group-hover:text-cyan-300
            "
          />
        )}
      </div>

      <p className="mt-5 font-semibold text-white">
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
              ? "text-emerald-300"
              : "text-slate-600"
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