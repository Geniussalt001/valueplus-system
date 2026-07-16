import type {
  CSSProperties,
} from "react";

import {
  ArrowUpRight,
  Link2,
  LockKeyhole,
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
      isOnline
        ? module.color
        : "#64748b",
  } as CSSProperties;

  const openModule = () => {
    if (!isOnline) {
      return;
    }

    onOpen(module);
  };

  return (
    <button
      type="button"
      disabled={!isOnline}
      onClick={openModule}
      title={
        isOnline
          ? `เปิดระบบ ${module.title}`
          : "ระบบนี้ยังไม่เปิดใช้งาน"
      }
      aria-label={
        isOnline
          ? `เปิดระบบ ${module.title}`
          : `${module.title} ยังไม่เปิดใช้งาน`
      }
      className={`
        module-card group relative min-h-[285px]
        overflow-hidden p-6 text-left
        ${
          isOnline
            ? "cursor-pointer"
            : "cursor-not-allowed opacity-65 grayscale-[0.2]"
        }
      `}
      style={accentStyle}
    >
      <div className="module-card-glow" />

      <span className="pointer-events-none absolute right-7 top-5 text-5xl font-bold text-white/[0.025]">
        {String(
          module.id,
        ).padStart(2, "0")}
      </span>

      {!isOnline && (
        <div className="absolute right-5 top-5 z-20 flex items-center gap-1.5 rounded-lg border border-red-300/20 bg-red-400/[0.08] px-2.5 py-1.5 text-red-300 shadow-[0_0_18px_rgba(248,113,113,0.08)]">
          <Link2 size={13} />
          <LockKeyhole size={14} />
        </div>
      )}

      <div className="relative z-10 flex h-full flex-col">
        <div
          className={`
            module-icon flex h-14 w-14
            items-center justify-center
            ${
              isOnline
                ? ""
                : "border-red-300/15 text-slate-500"
            }
          `}
        >
          <Icon size={25} />
        </div>

        <p
          className="mt-7 text-[10px] font-semibold tracking-[0.22em]"
          style={{
            color: isOnline
              ? module.color
              : "#94a3b8",
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
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.08em]"
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

          {isOnline ? (
            <span className="module-open-button flex h-9 w-9 items-center justify-center">
              <ArrowUpRight
                size={17}
              />
            </span>
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-300/15 bg-red-300/[0.05] text-red-300/70">
              <LockKeyhole
                size={16}
              />
            </span>
          )}
        </div>
      </div>

      {!isOnline && (
        <div className="pointer-events-none absolute inset-0 z-[5] bg-[#020812]/10" />
      )}
    </button>
  );
}