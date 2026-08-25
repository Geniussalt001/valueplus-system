import type {
  CSSProperties,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  FileSpreadsheet,
  Globe2,
  HandCoins,
  Layers3,
} from "lucide-react";

import type {
  WorkRoute,
} from "../../types/app";

interface PostingCenterPageProps {
  onBack: () => void;
  onNavigate: (route: WorkRoute) => void;
}

const postingMenus = [
  {
    route: "daily-so" as const,
    title: "ลงยอด SO รายวัน",
    subtitle: "DAILY SO IMPORT",
    description: "อ่าน PO จับคู่สินค้า รวมยอด และสร้างไฟล์ Q19 กับ Q20 อัตโนมัติ",
    icon: FileSpreadsheet,
    color: "#356bc4",
  },
  {
    route: "receivables-freight" as const,
    title: "ลงยอดลูกหนี้–ค่าขนส่ง",
    subtitle: "RECEIVABLES & FREIGHT",
    description: "บันทึก ตรวจสอบ และติดตามยอดลูกหนี้กับค่าขนส่ง",
    icon: HandCoins,
    color: "#2c7f9e",
  },
  {
    route: "retail-worldwide-po" as const,
    title: "ลงยอด PO รีเทลขายเวิร์ลไวด์",
    subtitle: "RETAIL WORLDWIDE PO",
    description: "บันทึกเลข IV, PO, SO และไฟล์ PDF พร้อมติดตามการตอบรับ",
    icon: Globe2,
    color: "#7560b8",
  },
  {
    route: "monthly-sales-posting" as const,
    title: "ลงยอดขายรายเดือน",
    subtitle: "MONTHLY SALES POSTING",
    description: "พื้นที่สำหรับรวบรวม ตรวจสอบ และบันทึกยอดขายประจำเดือน",
    icon: CalendarRange,
    color: "#c87917",
  },
];

export function PostingCenterPage({
  onBack,
  onNavigate,
}: PostingCenterPageProps) {
  return (
    <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8 lg:py-9">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <div className="border-l-4 border-blue-600 px-7 py-7 lg:px-9">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
          >
            <ArrowLeft size={17} />
            กลับหน้าแดชบอร์ด
          </button>
          <div className="mt-7 flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Layers3 size={27} />
            </span>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.24em] text-blue-600">POSTING CENTER</p>
              <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-slate-900">ลงยอดรายวัน</h2>
              <p className="mt-1 text-sm text-slate-500">เลือกส่วนงานที่ต้องการดำเนินการ</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-2">
        {postingMenus.map((menu) => {
          const Icon = menu.icon;
          return (
            <button
              key={menu.route}
              type="button"
              onClick={() => onNavigate(menu.route)}
              className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 text-left shadow-[0_14px_38px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_48px_rgba(15,23,42,0.11)]"
              style={{ "--posting-accent": menu.color } as CSSProperties}
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-[var(--posting-accent)]" />
              <div className="flex items-start justify-between gap-5">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    color: menu.color,
                    backgroundColor: `${menu.color}14`,
                  }}
                >
                  <Icon size={23} />
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition group-hover:border-[var(--posting-accent)] group-hover:text-[var(--posting-accent)]">
                  <ArrowRight size={17} />
                </span>
              </div>
              <p className="mt-6 text-[10px] font-semibold tracking-[0.2em] text-[var(--posting-accent)]">{menu.subtitle}</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">{menu.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{menu.description}</p>
            </button>
          );
        })}
      </section>
    </div>
  );
}
