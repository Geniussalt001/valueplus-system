import {
  ArrowLeft,
  LoaderCircle,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";

import type {
  AppUser,
} from "../../../auth/auth.types";

interface PoDataHeaderProps {
  currentUser: AppUser;
  canClear: boolean;
  clearing?: boolean;
  onBack: () => void;
  onCreate: () => void;
  onClear: () => void;
}

export function PoDataHeader({
  currentUser,
  canClear,
  clearing = false,
  onBack,
  onCreate,
  onClear,
}: PoDataHeaderProps) {
  const isAdmin =
    currentUser.role === "admin";

  return (
    <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-5 flex items-center gap-2 text-sm text-slate-500 transition hover:text-cyan-300"
        >
          <ArrowLeft size={17} />
          กลับหน้าแดชบอร์ด
        </button>

        <p className="text-[10px] font-semibold tracking-[0.24em] text-emerald-300">
          PO DATA MANAGEMENT
        </p>

        <h2 className="mt-2 text-3xl font-semibold text-white">
          ระบบลงข้อมูล PO
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-400">
            ลงทะเบียน ติดตาม และตรวจสอบเอกสาร PO
          </p>

          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1 text-[10px] tracking-[0.12em] text-cyan-300">
            <UserRound size={12} />
            {currentUser.displayName}
          </span>
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={
              !canClear ||
              clearing
            }
            onClick={onClear}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-300/[0.06] px-5 py-3 text-sm text-red-300 transition hover:bg-red-300/10 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {clearing ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
            ) : (
              <Trash2 size={18} />
            )}

            ล้างข้อมูล
          </button>

          <button
            type="button"
            onClick={onCreate}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-3 text-sm font-medium text-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-300/15"
          >
            <Plus size={18} />
            เพิ่มรายการ PO
          </button>
        </div>
      )}
    </header>
  );
}