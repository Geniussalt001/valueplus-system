import {
  LoaderCircle,
} from "lucide-react";

import type {
  ProcessorActivity,
} from "../../hooks/usePoProcessor";

interface ProcessingOverlayProps {
  activity:
    ProcessorActivity;
}

const activityMessages: Record<
  Exclude<
    ProcessorActivity,
    "idle"
  >,
  string
> = {
  selecting:
    "กำลังเปิดหน้าต่างเลือกไฟล์...",

  previewing:
    "กำลังอ่าน PDF และจับคู่สินค้า...",

  exporting:
    "กำลังสร้างไฟล์ Excel...",
};

export function ProcessingOverlay({
  activity,
}: ProcessingOverlayProps) {
  if (
    activity === "idle"
  ) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-[#020812]/75
        backdrop-blur-sm
      "
    >
      <div
        className="
          flex
          min-w-72
          flex-col
          items-center
          rounded-2xl
          border
          border-cyan-300/20
          bg-[#061524]
          p-8
          shadow-[0_0_60px_rgba(34,211,238,0.1)]
        "
      >
        <div className="relative">
          <span
            className="
              absolute
              inset-0
              animate-ping
              rounded-full
              bg-cyan-300/10
            "
          />

          <LoaderCircle
            size={42}
            className="
              relative
              animate-spin
              text-cyan-300
            "
          />
        </div>

        <p className="mt-6 text-sm font-medium text-white">
          {
            activityMessages[
              activity
            ]
          }
        </p>

        <div className="mt-4 h-1 w-48 overflow-hidden rounded-full bg-slate-800">
          <div
            className="
              h-full
              w-1/2
              animate-pulse
              rounded-full
              bg-gradient-to-r
              from-cyan-400
              to-blue-400
              shadow-[0_0_12px_#22d3ee]
            "
          />
        </div>

        <p className="mt-4 text-xs text-slate-500">
          กรุณาอย่าปิดโปรแกรม
          ระหว่างประมวลผล
        </p>
      </div>
    </div>
  );
}