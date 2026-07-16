import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import type { SystemModule } from "../types/app";

interface SystemCardProps {
  module: SystemModule;
  onOpen: (module: SystemModule) => void;
}

export function SystemCard({ module, onOpen }: SystemCardProps) {
  const Icon = module.icon;

  const cardStyle = {
    "--accent-color": module.color,
  } as CSSProperties;

  return (
    <button
      type="button"
      style={cardStyle}
      onClick={() => onOpen(module)}
      className="module-card group relative min-h-[260px] overflow-hidden p-6 text-left"
    >
      <div className="module-card-glow" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div className="module-icon flex h-14 w-14 items-center justify-center">
            <Icon size={26} />
          </div>

          <span className="font-mono text-5xl font-bold text-white/[0.035]">
            {String(module.id).padStart(2, "0")}
          </span>
        </div>

        <div className="mt-8">
          <p
            className="text-[10px] font-semibold tracking-[0.24em]"
            style={{ color: module.color }}
          >
            {module.subtitle}
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">
            {module.title}
          </h3>

          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
            {module.description}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between pt-6">
          <span className="flex items-center gap-2 text-xs text-slate-400">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: module.color,
                boxShadow: `0 0 9px ${module.color}`,
              }}
            />
            พร้อมพัฒนา
          </span>

          <span className="module-open-button flex h-9 w-9 items-center justify-center">
            <ArrowUpRight size={17} />
          </span>
        </div>
      </div>
    </button>
  );
}