import {
  LoaderCircle,
} from "lucide-react";

import {
  createPortal,
} from "react-dom";

import {
  AnimatedProgressBar,
} from "./AnimatedProgressBar";

import {
  IndeterminateProgressBar,
} from "./IndeterminateProgressBar";

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
    !open ||
    typeof document === "undefined"
  ) {
    return null;
  }

  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[1400]
        flex
        items-center
        justify-center
        bg-slate-900/25
        px-5
        backdrop-blur-[4px]
      "
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="
          w-full
          max-w-sm
          rounded-3xl
          border
          border-cyan-300/45
          bg-white/95
          px-8
          py-7
          text-center
          shadow-[0_24px_70px_rgba(8,47,73,0.24)]
        "
      >
        <div
          className="
            mx-auto
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-2xl
            border
            border-cyan-200
            bg-cyan-50
            text-cyan-600
          "
        >
          <LoaderCircle
            className="animate-spin"
            size={34}
          />
        </div>

        <p
          className="
            mt-6
            text-base
            font-semibold
            text-slate-800
          "
        >
          {title}
        </p>

        {visibleProgress === undefined ? (
          <IndeterminateProgressBar className="mt-5" />
        ) : (
          <>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-cyan-700">
              {Math.round(visibleProgress)}%
            </p>
            <AnimatedProgressBar
              progress={visibleProgress}
              className="mt-4"
            />
          </>
        )}

        <p
          className="
            mt-4
            text-xs
            leading-5
            text-slate-500
          "
        >
          {description}
        </p>
      </div>
    </div>,
    document.body,
  );
}
