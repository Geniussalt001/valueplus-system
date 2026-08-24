import type {
  CSSProperties,
} from "react";

import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  FileSpreadsheet,
  HandCoins,
} from "lucide-react";

import type {
  WorkRoute,
} from "../../types/app";

type DailyPostingChildRoute =
  | "daily-so"
  | "receivables-freight"
  | "monthly-sales";

interface DailyPostingPageProps {
  onBack: () => void;
  onNavigate: (
    route: DailyPostingChildRoute,
  ) => void;
}

const dailyPostingModules: Array<{
  route: DailyPostingChildRoute;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof FileSpreadsheet;
  color: string;
  eyebrow: string;
}> = [
  {
    route: "daily-so",
    title: "ลงยอด SO รายวัน",
    subtitle: "DAILY SO IMPORT",
    description:
      "อ่าน PO จับคู่สินค้า รวมยอด และสร้างไฟล์ Q19 กับ Q20 อัตโนมัติ",
    icon: FileSpreadsheet,
    color: "#356bc4",
    eyebrow: "01",
  },
  {
    route: "receivables-freight",
    title: "ลงยอดลูกหนี้–ค่าขนส่ง",
    subtitle:
      "RECEIVABLES & FREIGHT",
    description:
      "บันทึก ตรวจสอบ และติดตามยอดลูกหนี้กับค่าขนส่ง",
    icon: HandCoins,
    color: "#159b82",
    eyebrow: "02",
  },
  {
    route: "monthly-sales",
    title: "ลงยอดขายรายเดือน",
    subtitle:
      "MONTHLY SALES POSTING",
    description:
      "พื้นที่สำหรับงานลงยอดขายรายเดือน พร้อมรับรายละเอียดขั้นตอนการทำงาน",
    icon: BarChart3,
    color: "#b51632",
    eyebrow: "03",
  },
];

export function DailyPostingPage({
  onBack,
  onNavigate,
}: DailyPostingPageProps) {
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
            กลับหน้าแดชบอร์ด
          </button>

          <p className="text-[10px] font-semibold tracking-[0.24em] text-blue-700">
            DAILY POSTING CENTER
          </p>

          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            ลงยอดรายวัน
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            เลือกส่วนงานที่ต้องการ ระบบจะแยกข้อมูลและขั้นตอนของแต่ละงานออกจากกันอย่างชัดเจน
          </p>
        </div>

        <div className="vp-page-icon flex h-12 w-12 items-center justify-center rounded-xl">
          <CalendarDays size={23} />
        </div>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {dailyPostingModules.map(
          (module) => {
            const Icon = module.icon;
            const accentStyle = {
              "--accent-color":
                module.color,
            } as CSSProperties;

            return (
              <button
                key={module.route}
                type="button"
                onClick={() => {
                  onNavigate(
                    module.route,
                  );
                }}
                className="module-card group relative min-h-[280px] overflow-hidden p-7 text-left"
                style={accentStyle}
                aria-label={`เปิดส่วนงาน ${module.title}`}
              >
                <div className="module-card-glow" />

                <span className="pointer-events-none absolute right-7 top-5 text-5xl font-bold text-slate-900/[0.035]">
                  {module.eyebrow}
                </span>

                <div className="relative z-10 flex h-full flex-col">
                  <div className="module-icon flex h-14 w-14 items-center justify-center">
                    <Icon size={26} />
                  </div>

                  <p
                    className="mt-7 text-[10px] font-semibold tracking-[0.22em]"
                    style={{
                      color: module.color,
                    }}
                  >
                    {module.subtitle}
                  </p>

                  <h3 className="mt-3 text-xl font-semibold text-slate-900">
                    {module.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {module.description}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-5 pt-7">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-emerald-700">
                      <span
                        className="status-light status-online"
                        aria-hidden="true"
                      />
                      พร้อมใช้งาน
                    </span>

                    <span className="module-open-button flex h-10 w-10 items-center justify-center">
                      <ArrowUpRight size={17} />
                    </span>
                  </div>
                </div>
              </button>
            );
          },
        )}
      </section>
    </div>
  );
}

export type {
  DailyPostingChildRoute,
  WorkRoute,
};
