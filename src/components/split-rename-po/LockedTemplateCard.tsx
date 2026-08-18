import {
  FileSpreadsheet,
  LockKeyhole,
} from "lucide-react";

interface LockedTemplateCardProps {
  templatePath: string;
}

export function LockedTemplateCard({
  templatePath,
}: LockedTemplateCardProps) {
  const fileName =
    getFileName(
      templatePath,
    );

  return (
    <div
      className="
        vp-setup-card
        relative
        min-h-44
        overflow-hidden
        rounded-2xl
        border
        border-blue-300/20
        bg-[#061524]/80
        p-5
      "
    >
      <div
        className="
          pointer-events-none
          absolute
          -right-12
          -top-12
          h-36
          w-36
          rounded-full
          bg-blue-400/10
          blur-3xl
        "
      />

      <div className="relative flex items-start justify-between gap-4">
        <span
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-xl
            border
            border-blue-300/20
            bg-blue-300/[0.07]
            text-blue-300
          "
        >
          <FileSpreadsheet
            size={23}
          />
        </span>

        <span
          className="
            inline-flex
            items-center
            gap-2
            rounded-full
            border
            border-blue-300/20
            bg-blue-300/[0.07]
            px-3
            py-1.5
            text-[10px]
            font-semibold
            tracking-[0.12em]
            text-blue-300
          "
        >
          <LockKeyhole
            size={12}
          />

          LOCKED
        </span>
      </div>

      <p className="relative mt-5 font-semibold text-white">
        Excel Template
      </p>

      <p
        className="
          relative
          mt-4
          truncate
          text-xs
          text-blue-200
        "
        title={
          templatePath
        }
      >
        {fileName ||
          "กำลังค้นหา Template..."}
      </p>
    </div>
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
