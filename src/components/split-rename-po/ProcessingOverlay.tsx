import {
  LoaderCircle,
} from "lucide-react";

import {
  createPortal,
} from "react-dom";

import type {
  ProcessorActivity,
} from "../../hooks/usePoProcessor";

import {
  useAnimatedProgress,
} from "../../hooks/useAnimatedProgress";

import {
  AnimatedProgressBar,
} from "../common/AnimatedProgressBar";

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
    "กำลังสร้างและบันทึกไฟล์ Excel...",

  printing:
    "กำลังเตรียมเอกสารสำหรับพิมพ์...",
};

export function ProcessingOverlay({
  activity,
}: ProcessingOverlayProps) {
  const progress =
    useAnimatedProgress(
      activity !== "idle",
    );

  if (
    activity === "idle"
  ) {
    return null;
  }

  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[10000]
        flex
        items-center
        justify-center
        bg-slate-900/30
        p-4
        backdrop-blur-[3px]
      "
      role="status"
      aria-live="polite"
      aria-label={
        activityMessages[
          activity
        ]
      }
    >
      <div
        className="
          flex
          w-full
          max-w-sm
          flex-col
          items-center
          rounded-3xl
          border
          border-sky-200
          bg-white/95
          p-7
          text-center
          shadow-[0_24px_80px_rgba(15,23,42,0.24)]
        "
      >
        <div
          className="
            relative
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-2xl
            border
            border-cyan-200
            bg-cyan-50
          "
        >
          <span
            className="
              absolute
              inset-2
              animate-ping
              rounded-full
              bg-cyan-400/15
            "
          />

          <LoaderCircle
            size={36}
            className="
              relative
              animate-spin
              text-sky-600
            "
          />
        </div>

        <p
          className="
            mt-5
            text-base
            font-semibold
            text-slate-900
          "
        >
          {
            activityMessages[
              activity
            ]
          }
        </p>

        <p className="mt-3 text-3xl font-semibold tabular-nums text-sky-700">
          {Math.round(progress)}%
        </p>

        <AnimatedProgressBar
          progress={progress}
          className="mt-4"
          tone="sky"
        />

        <p
          className="
            mt-4
            text-xs
            leading-5
            text-slate-500
          "
        >
          {activity ===
          "printing"
            ? "กรุณารอหน้าต่างเลือกเครื่องพิมพ์"
            : "กรุณาอย่าปิดโปรแกรมระหว่างประมวลผล"}
        </p>
      </div>
    </div>,
    document.body,
  );
}
