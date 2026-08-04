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

  const accentStyle = {
    "--accent-color":
      isOnline
        ? module.color
        : "#94a3b8",
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
        module-card group relative min-h-[245px]
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

      <span className="pointer-events-none absolute right-7 top-5 text-5xl font-bold text-slate-900/[0.035]">
        {String(
          module.id,
        ).padStart(2, "0")}
      </span>

      {!isOnline && (
        <div className="absolute right-5 top-5 z-20 flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-slate-500">
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
                : "text-slate-500"
            }
          `}
        >
          <Icon size={25} />
        </div>

        <p
          className="mt-6 text-[10px] font-semibold tracking-[0.22em]"
          style={{
            color: isOnline
              ? module.color
              : "#7b8fa3",
          }}
        >
          {module.subtitle}
        </p>

        <h3 className="mt-3 text-lg font-semibold">
          {module.title}
        </h3>

        <p className="mt-2.5 text-sm leading-6">
          {module.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-5 pt-6">
          <span
            className={`
              inline-flex items-center gap-2 text-xs
              font-semibold tracking-[0.08em]
              ${isOnline ? "text-emerald-700" : "text-slate-500"}
            `}
          >
            <span
              className={`
                status-light
                ${isOnline ? "status-online" : "status-offline"}
              `}
              aria-hidden="true"
            />

            {isOnline
              ? "ONLINE"
              : "OFFLINE"}
          </span>

          {isOnline ? (
            <span className="module-open-button flex h-10 w-10 items-center justify-center">
              <ArrowUpRight
                size={17}
              />
            </span>
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-slate-100 text-slate-500">
              <LockKeyhole
                size={16}
              />
            </span>
          )}
        </div>
      </div>

      {!isOnline && (
        <div className="pointer-events-none absolute inset-0 z-[5] bg-slate-100/10" />
      )}
    </button>
  );
}
