import {
  ArrowLeft,
  CalendarRange,
  Construction,
} from "lucide-react";

interface MonthlySalesPostingPageProps {
  onBack: () => void;
}

export function MonthlySalesPostingPage({
  onBack,
}: MonthlySalesPostingPageProps) {
  return (
    <div className="mx-auto max-w-[1250px] px-5 py-7 lg:px-8 lg:py-9">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <div className="border-l-4 border-amber-500 px-7 py-7 lg:px-9">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
          >
            <ArrowLeft size={17} />
            กลับเมนูลงยอดรายวัน
          </button>
          <div className="mt-7 flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <CalendarRange size={27} />
            </span>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.24em] text-amber-600">MONTHLY SALES POSTING</p>
              <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-slate-900">ลงยอดขายรายเดือน</h2>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-amber-300 bg-gradient-to-br from-white via-amber-50/50 to-orange-50 px-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
          <Construction size={29} />
        </span>
        <h3 className="mt-5 text-xl font-bold text-slate-900">เพิ่มเมนูพร้อมแล้ว</h3>
        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
          ส่วนประมวลผลยอดขายรายเดือนจะพัฒนาต่อเมื่อกำหนดรูปแบบไฟล์ต้นทางและผลลัพธ์ที่ต้องการ
        </p>
      </section>
    </div>
  );
}
