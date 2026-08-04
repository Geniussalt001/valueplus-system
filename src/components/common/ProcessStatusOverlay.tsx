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

import {
  AnimatedProgressBar,
} from "./AnimatedProgressBar";

interface ProcessStatusOverlayProps {
  open: boolean;
  title: string;
  description?: string;
  progress?: number;
}

export function ProcessStatusOverlay({
  open,
  title,
  description = "กรุณาอย่าปิดโปรแกรมระหว่างประมวลผล",
  progress,
}: ProcessStatusOverlayProps) {
  const [visible, setVisible] =
    useState(open);
  const [completed, setCompleted] =
    useState(false);
  const wasOpenRef = useRef(open);

  useEffect(() => {
    let hideTimer:
      | ReturnType<typeof setTimeout>
      | undefined;

    if (open) {
      setVisible(true);
      setCompleted(false);
    } else if (wasOpenRef.current) {
      setVisible(true);
      setCompleted(true);
      hideTimer = setTimeout(() => {
        setVisible(false);
        setCompleted(false);
      }, 4000);
    }

    wasOpenRef.current = open;

    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [open]);

  const visibleProgress =
    progress === undefined
      ? undefined
      : Math.max(
          0,
          Math.min(
            100,
            progress,
          ),
        );

  if (
    !visible ||
    typeof document === "undefined"
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
        z-[1400]
        w-[min(390px,calc(100vw-2rem))]
      "
      role="status"
      aria-live="polite"
      aria-busy={open}
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
            ${completed
              ? "border-emerald-200 bg-emerald-50 text-emerald-600"
              : "border-cyan-200 bg-cyan-50 text-cyan-600"}
          `}
        >
          {completed ? (
            <CheckCircle2 size={23} />
          ) : (
            <LoaderCircle className="animate-spin" size={23} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {completed ? "ดำเนินการเรียบร้อยแล้ว" : title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {completed ? "ระบบบันทึกผลลัพธ์และพร้อมใช้งานต่อแล้ว" : description}
          </p>

          {visibleProgress !== undefined && !completed ? (
            <>
              <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span>ความคืบหน้า</span>
                <span className="tabular-nums text-cyan-700">{Math.round(visibleProgress)}%</span>
              </div>
              <AnimatedProgressBar progress={visibleProgress} className="mt-1.5" />
            </>
          ) : null}

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
