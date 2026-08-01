import { LoaderCircle } from "lucide-react";

import {
  AnimatedProgressBar,
} from "../../../components/common/AnimatedProgressBar";

import {
  useAnimatedProgress,
} from "../../../hooks/useAnimatedProgress";

interface OperationIndicatorProps {
  message: string;
}

export function OperationIndicator({
  message,
}: OperationIndicatorProps) {
  const progress =
    useAnimatedProgress(
      Boolean(message),
    );

  if (!message) return null;

  return (
    <div className="fixed bottom-7 right-7 z-[70] flex min-w-72 items-center gap-4 rounded-2xl border border-cyan-300/25 bg-[#061525]/95 px-5 py-4 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10">
        <LoaderCircle
          size={22}
          className="animate-spin text-cyan-300"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] tracking-[0.18em] text-cyan-300">
            PROCESSING
          </p>
          <span className="text-sm font-semibold tabular-nums text-cyan-200">
            {Math.round(progress)}%
          </span>
        </div>

        <p className="mt-1 text-sm text-slate-200">
          {message}
        </p>

        <AnimatedProgressBar
          progress={progress}
          className="mt-3 bg-slate-700"
        />
      </div>
    </div>
  );
}
