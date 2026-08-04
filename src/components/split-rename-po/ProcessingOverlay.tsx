import {
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

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
    "กำลังสร้างและบันทึกไฟล์ Excel...",

  printing:
    "กำลังเตรียมเอกสารสำหรับพิมพ์...",
};

export function ProcessingOverlay({
  activity,
}: ProcessingOverlayProps) {
  const active =
    activity !== "idle" &&
    activity !== "selecting";
  const [visible, setVisible] =
    useState(active);
  const [completed, setCompleted] =
    useState(false);
  const [lastActivity, setLastActivity] =
    useState<ProcessorActivity>(activity);
  const wasActiveRef = useRef(active);

  useEffect(() => {
    let hideTimer:
      | ReturnType<typeof setTimeout>
      | undefined;

    if (active) {
      setLastActivity(activity);
      setVisible(true);
      setCompleted(false);
    } else if (wasActiveRef.current) {
      setVisible(true);
      setCompleted(true);
      hideTimer = setTimeout(() => {
        setVisible(false);
        setCompleted(false);
      }, 4000);
    }

    wasActiveRef.current = active;

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [active, activity]);

  if (
    !visible ||
    lastActivity === "idle" ||
    lastActivity === "selecting"
  ) {
    return null;
  }

  return createPortal(
    <div
      className="
        vp-process-toast
        fixed
        right-5
        top-[208px]
        z-[10000]
        w-[min(390px,calc(100vw-2rem))]
      "
      role="status"
      aria-live="polite"
      aria-label={
        completed
          ? "ดำเนินการเรียบร้อยแล้ว"
          : activityMessages[lastActivity]
      }
    >
      <div
        className="
          flex
          items-start
          gap-4
          rounded-2xl
          border
          border-slate-200
          bg-white
          px-5
          py-4
          text-left
          shadow-[0_20px_55px_rgba(30,41,59,0.18)]
        "
      >
        <div
          className={`
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            ${completed ? "border-emerald-200 bg-emerald-50" : "border-cyan-200 bg-cyan-50"}
          `}
        >
          {completed ? (
            <CheckCircle2 size={23} className="text-emerald-600" />
          ) : (
            <LoaderCircle size={23} className="animate-spin text-sky-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {completed ? "ดำเนินการเรียบร้อยแล้ว" : activityMessages[lastActivity]}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {completed
              ? "ระบบบันทึกผลลัพธ์และพร้อมใช้งานต่อแล้ว"
              : lastActivity === "printing"
                ? "กรุณารอหน้าต่างเลือกเครื่องพิมพ์"
                : "สามารถติดตามรายละเอียดได้จาก Processing Log"}
          </p>
          {completed ? (
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-emerald-100">
              <span className="vp-process-toast-timer block h-full rounded-full bg-emerald-500" />
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
