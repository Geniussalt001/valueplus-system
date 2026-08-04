interface IndeterminateProgressBarProps {
  className?: string;
}

export function IndeterminateProgressBar({
  className = "",
}: IndeterminateProgressBarProps) {
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}
      role="progressbar"
      aria-label="กำลังดำเนินการ"
    >
      <div className="loading-bar h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600" />
    </div>
  );
}
