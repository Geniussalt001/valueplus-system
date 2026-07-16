import type {
  CSSProperties,
} from "react";

import {
  ArrowUpRight,
} from "lucide-react";

import type {
  SystemModule,
} from "../types/app";

interface SystemCardProps {
  module: SystemModule;
  onOpen: (
    module: SystemModule,
  ) => void;
}

export function SystemCard({
  module,
  onOpen,
}: SystemCardProps) {
  const Icon = module.icon;

  const isOnline =
    module.status === "online";

  const statusColor =
    isOnline
      ? "#34d399"
      : "#f87171";

  const accentStyle = {
    "--accent-color":
      module.color,
  } as CSSProperties;

  return (
    <button
      type="button"
      onClick={() =>
        onOpen(module)
      }
      className="module-card group relative min-h-[285px] overflow-hidden p-6 text-left"
      style={accentStyle}
    >
      <div className="module-card-glow" />

      <span className="pointer-events-none absolute right-7 top-5 text-5xl font-bold text-white/[0.025]">
        {String(
          module.id,
        ).padStart(2, "0")}
      </span>

      <div className="relative z-10 flex h-full flex-col">
        <div className="module-icon flex h-14 w-14 items-center justify-center">
          <Icon size={25} />
        </div>

        <p
          className="mt-7 text-[10px] font-semibold tracking-[0.22em]"
          style={{
            color: module.color,
          }}
        >
          {module.subtitle}
        </p>

        <h3 className="mt-3 text-xl font-semibold text-white">
          {module.title}
        </h3>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          {module.description}
        </p>

        <div className="mt-auto flex items-center justify-between pt-7">
          <span
            className="inline-flex items-center gap-2 text-xs font-medium"
            style={{
              color: statusColor,
            }}
          >
            <span className="relative flex h-2 w-2">
              {isOnline && (
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
                  style={{
                    backgroundColor:
                      statusColor,
                  }}
                />
              )}

              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    statusColor,
                  boxShadow: `0 0 9px ${statusColor}`,
                }}
              />
            </span>

            {isOnline
              ? "ONLINE"
              : "OFFLINE"}
          </span>

          <span className="module-open-button flex h-9 w-9 items-center justify-center">
            <ArrowUpRight
              size={17}
            />
          </span>
        </div>
      </div>
    </button>
  );
}