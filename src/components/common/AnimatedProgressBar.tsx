interface AnimatedProgressBarProps {
  progress: number;
  className?: string;
  tone?:
    | "cyan"
    | "emerald"
    | "sky"
    | "violet";
}

export function AnimatedProgressBar({
  progress,
  className = "",
  tone = "cyan",
}: AnimatedProgressBarProps) {
  const toneClass = {
    cyan:
      "from-cyan-400 to-blue-600",
    emerald:
      "from-emerald-400 to-emerald-600",
    sky:
      "from-sky-400 to-blue-600",
    violet:
      "from-violet-400 to-violet-700",
  }[tone];
  const safeProgress = Math.max(
    0,
    Math.min(100, progress),
  );

  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={
        Math.round(safeProgress)
      }
    >
      <div
        className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-200 ease-out ${toneClass}`}
        style={{
          width: `${safeProgress}%`,
        }}
      />
    </div>
  );
}
