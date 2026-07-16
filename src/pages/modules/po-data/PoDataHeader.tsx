import { ArrowLeft, Plus } from "lucide-react";

interface PoDataHeaderProps {
  onBack: () => void;
  onCreate: () => void;
}

export function PoDataHeader({
  onBack,
  onCreate,
}: PoDataHeaderProps) {
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

        <p className="mt-3 text-sm text-slate-400">
          ลงทะเบียน ติดตาม และตรวจสอบเอกสาร PO
        </p>
      </div>

      <button
        type="button"
        onClick={onCreate}
        className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-3 text-sm font-medium text-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-300/15"
      >
        <Plus size={18} />
        เพิ่มรายการ PO
      </button>
    </header>
  );
}