import {
  AlertTriangle,
  CheckCircle2,
  FileStack,
  SearchCheck,
} from "lucide-react";

import type {
  PoPreviewResult,
} from "../../types/poProcessor.types";

interface PoProcessingSummaryProps {
  result:
    PoPreviewResult;
}

export function PoProcessingSummary({
  result,
}: PoProcessingSummaryProps) {
  const summaryCards = [
    {
      label:
        "PO ทั้งหมด",

      value:
        result.po_count,

      icon:
        FileStack,

      color:
        "text-cyan-300",

      background:
        "bg-cyan-300/[0.06]",

      border:
        "border-cyan-300/15",
    },

    {
      label:
        "พร้อมสร้าง",

      value:
        result.ready_count,

      icon:
        CheckCircle2,

      color:
        "text-emerald-300",

      background:
        "bg-emerald-300/[0.06]",

      border:
        "border-emerald-300/15",
    },

    {
      label:
        "รอตรวจสอบ",

      value:
        result.review_count,

      icon:
        SearchCheck,

      color:
        "text-amber-300",

      background:
        "bg-amber-300/[0.06]",

      border:
        "border-amber-300/15",
    },

    {
      label:
        "ผิดพลาด",

      value:
        result.error_count,

      icon:
        AlertTriangle,

      color:
        "text-red-300",

      background:
        "bg-red-300/[0.06]",

      border:
        "border-red-300/15",
    },
  ];

  return (
    <div
      className="
        grid
        gap-3
        sm:grid-cols-2
        xl:grid-cols-4
      "
    >
      {summaryCards.map(
        (
          card,
        ) => {
          const Icon =
            card.icon;

          return (
            <div
              key={
                card.label
              }
              className={`
                vp-summary-card
                rounded-xl
                border
                p-4
                ${card.border}
                ${card.background}
              `}
            >
              <div className="flex items-start justify-between">
                <Icon
                  size={18}
                  className={
                    card.color
                  }
                />

                <span
                  className={`
                    h-2
                    w-2
                    animate-pulse
                    rounded-full
                    ${card.color.replace(
                      "text-",
                      "bg-",
                    )}
                  `}
                />
              </div>

              <p
                className={`
                  mt-4
                  text-2xl
                  font-semibold
                  ${card.color}
                `}
              >
                {card.value}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {
                  card.label
                }
              </p>
            </div>
          );
        },
      )}
    </div>
  );
}
