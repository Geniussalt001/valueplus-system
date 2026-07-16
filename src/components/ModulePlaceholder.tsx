import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Construction,
} from "lucide-react";

interface ModulePlaceholderProps {
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  color: string;
  onBack: () => void;
}

export function ModulePlaceholder({
  title,
  subtitle,
  description,
  icon: Icon,
  color,
  onBack,
}: ModulePlaceholderProps) {
  return (
    <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-300"
      >
        <ArrowLeft size={17} />
        กลับหน้าแดชบอร์ด
      </button>

      <section className="relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#061525]/80 p-8 shadow-[0_25px_70px_rgba(0,0,0,0.25)]">
        <div
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-10 blur-[90px]"
          style={{ backgroundColor: color }}
        />

        <div className="relative z-10">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl border"
            style={{
              color,
              borderColor: `${color}40`,
              backgroundColor: `${color}12`,
              boxShadow: `0 0 35px ${color}12`,
            }}
          >
            <Icon size={29} />
          </div>

          <p
            className="mt-7 text-xs font-semibold tracking-[0.24em]"
            style={{ color }}
          >
            {subtitle}
          </p>

          <h2 className="mt-3 text-3xl font-semibold text-white">
            {title}
          </h2>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
            {description}
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-3">
        <InformationCard
          icon={Construction}
          title="สถานะการพัฒนา"
          value="กำลังเตรียมระบบ"
          color="text-amber-300"
        />

        <InformationCard
          icon={Clock3}
          title="การประมวลผล"
          value="ยังไม่เริ่มทำงาน"
          color="text-cyan-300"
        />

        <InformationCard
          icon={CheckCircle2}
          title="การเชื่อมต่อ"
          value="หน้าระบบพร้อมแล้ว"
          color="text-emerald-300"
        />
      </section>
    </div>
  );
}

interface InformationCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  color: string;
}

function InformationCard({
  icon: Icon,
  title,
  value,
  color,
}: InformationCardProps) {
  return (
    <article className="rounded-xl border border-cyan-300/10 bg-[#051322]/75 p-5 shadow-[0_15px_40px_rgba(0,0,0,0.16)]">
      <Icon size={19} className={color} />

      <p className="mt-5 text-xs text-slate-500">
        {title}
      </p>

      <p className={`mt-2 text-sm font-medium ${color}`}>
        {value}
      </p>
    </article>
  );
}