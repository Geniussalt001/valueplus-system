import {
  ArrowLeft,
  Calculator,
  ReceiptText,
  Truck,
} from "lucide-react";

interface ReceivablesFreightPageProps {
  onBack: () => void;
}

export function ReceivablesFreightPage({
  onBack,
}: ReceivablesFreightPageProps) {
  return (
    <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-5 flex items-center gap-2 text-sm text-slate-500 transition hover:text-cyan-700"
          >
            <ArrowLeft size={17} />
            กลับหน้าแดชบอร์ด
          </button>

          <p className="text-[10px] font-semibold tracking-[0.24em] text-cyan-700">
            RECEIVABLES &amp; FREIGHT
          </p>

          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            ลงยอดลูกหนี้–ค่าขนส่ง
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            ศูนย์กลางสำหรับบันทึก ตรวจสอบ และติดตามยอดลูกหนี้กับค่าขนส่ง
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-50 text-cyan-700">
          <Calculator size={23} />
        </div>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <article className="group relative min-h-[260px] overflow-hidden rounded-3xl border border-cyan-300 bg-white/90 p-8 shadow-[0_20px_55px_rgba(8,145,178,0.10)]">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-100/70 blur-3xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300 bg-cyan-50 text-cyan-700">
            <ReceiptText size={30} />
          </div>
          <div className="relative mt-10">
            <p className="text-[10px] font-semibold tracking-[0.22em] text-cyan-700">
              RECEIVABLES
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">
              ลงยอดลูกหนี้
            </h3>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              เตรียมพื้นที่สำหรับลงทะเบียนยอดลูกหนี้ ตรวจสอบเอกสาร และติดตามสถานะการชำระ
            </p>
            <span className="mt-7 inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              เตรียมออกแบบระบบ
            </span>
          </div>
        </article>

        <article className="group relative min-h-[260px] overflow-hidden rounded-3xl border border-blue-300 bg-white/90 p-8 shadow-[0_20px_55px_rgba(37,99,235,0.10)]">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-100/70 blur-3xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-300 bg-blue-50 text-blue-700">
            <Truck size={30} />
          </div>
          <div className="relative mt-10">
            <p className="text-[10px] font-semibold tracking-[0.22em] text-blue-700">
              FREIGHT
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">
              ลงยอดค่าขนส่ง
            </h3>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              เตรียมพื้นที่สำหรับบันทึกค่าขนส่ง แยกเที่ยวรถ และตรวจสอบยอดตามรอบงาน
            </p>
            <span className="mt-7 inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              เตรียมออกแบบระบบ
            </span>
          </div>
        </article>
      </section>
    </div>
  );
}
