import {
  ArrowLeft,
  BarChart3,
  Clock3,
} from "lucide-react";

interface MonthlySalesPageProps {
  onBack: () => void;
}

export function MonthlySalesPage({
  onBack,
}: MonthlySalesPageProps) {
  return (
    <div className="vp-work-page mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
      <header className="vp-page-header flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-5 flex items-center gap-2 text-sm text-slate-500 transition hover:text-blue-700"
          >
            <ArrowLeft size={17} />
            กลับหน้าลงยอดรายวัน
          </button>

          <p className="text-[10px] font-semibold tracking-[0.24em] text-[#b51632]">
            MONTHLY SALES POSTING
          </p>

          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            ลงยอดขายรายเดือน
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            แยกพื้นที่ส่วนงานเรียบร้อยแล้ว พร้อมเพิ่มขั้นตอนการทำงานในลำดับถัดไป
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-[#b51632]">
          <BarChart3 size={23} />
        </div>
      </header>

      <section className="vp-content-card mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-[#b51632]">
            <Clock3 size={29} />
          </div>

          <p className="mt-6 text-[10px] font-semibold tracking-[0.22em] text-[#b51632]">
            READY FOR WORKFLOW
          </p>

          <h3 className="mt-3 text-2xl font-semibold text-slate-900">
            เตรียมส่วนงานไว้แล้ว
          </h3>

          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            หน้านี้รอรายละเอียดวิธีลงยอดขายรายเดือนจากคุณ โดยยังไม่มีการประมวลผลหรือบันทึกข้อมูลใด ๆ
          </p>
        </div>
      </section>
    </div>
  );
}
