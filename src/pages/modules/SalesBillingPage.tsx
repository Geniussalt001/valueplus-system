import {
  ArrowLeft,
  ClipboardCheck,
  ReceiptText,
} from "lucide-react";

interface SalesBillingPageProps {
  onBack: () => void;
}

export function SalesBillingPage({
  onBack,
}: SalesBillingPageProps) {
  return (
    <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-cyan-700 transition hover:text-cyan-500"
      >
        <ArrowLeft size={17} />
        กลับหน้าแดชบอร์ด
      </button>

      <header className="mt-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.24em] text-emerald-600">
            SALES BILLING
          </p>

          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            เปิดบิลขายสินค้า
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            เตรียม ตรวจสอบ และดำเนินการเปิดบิลขายสินค้าในขั้นตอนเดียว
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-300/50 bg-emerald-50 text-emerald-600">
          <ReceiptText size={23} />
        </div>
      </header>

      <section className="mt-8 overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm">
        <div className="border-b border-cyan-100 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-600">
              <ClipboardCheck size={20} />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                ส่วนงานเปิดบิลขายสินค้า
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                สร้างพื้นที่ส่วนงานเรียบร้อยแล้ว พร้อมออกแบบขั้นตอนการทำงานต่อ
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-[360px] items-center justify-center px-6 py-12 text-center">
          <div className="max-w-md">
            <ReceiptText
              size={42}
              className="mx-auto text-cyan-600"
            />
            <h3 className="mt-5 text-xl font-semibold text-slate-900">
              พร้อมกำหนดวิธีเปิดบิล
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              ขั้นต่อไปสามารถเพิ่มแหล่งข้อมูล วิธีอ่านรายการสินค้า การตรวจสอบ Preview และขั้นตอนบันทึกบิลตามการทำงานจริงได้
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
