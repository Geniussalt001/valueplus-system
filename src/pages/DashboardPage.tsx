import {
  Activity,
  Boxes,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { SystemCard } from "../components/SystemCard";
import { systemModules } from "../data/systemModules";
import type {
  SystemModule,
  WorkRoute,
} from "../types/app";

interface DashboardPageProps {
  onNavigate: (route: WorkRoute) => void;
}

export function DashboardPage({
  onNavigate,
}: DashboardPageProps) {
  const openModule = (module: SystemModule) => {
    onNavigate(module.route);
  };

  return (
    <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
      <section className="dashboard-hero relative overflow-hidden rounded-2xl border border-cyan-300/15 p-7 lg:p-9">
        <div className="hero-light" />

        <div className="relative z-10 flex flex-col justify-between gap-8 xl:flex-row xl:items-center">
          <div>
            <div className="flex items-center gap-2 text-cyan-300">
              <Sparkles size={17} />

              <span className="text-xs font-semibold tracking-[0.2em]">
                VALUEPLUS COMMAND CENTER
              </span>
            </div>

            <h2 className="mt-4 text-3xl font-semibold lg:text-4xl">
              ยินดีต้อนรับเข้าสู่ระบบ
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              ศูนย์กลางสำหรับจัดการเอกสาร ประมวลผลข้อมูล
              และติดตามงานภายในองค์กร
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatusBox
              icon={Boxes}
              value="05"
              label="ระบบงาน"
              color="text-cyan-300"
            />

            <StatusBox
              icon={Activity}
              value="100%"
              label="สถานะระบบ"
              color="text-emerald-300"
            />

            <StatusBox
              icon={ShieldCheck}
              value="LOCAL"
              label="การเชื่อมต่อ"
              color="text-blue-300"
            />
          </div>
        </div>
      </section>

      <section className="mt-9">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-cyan-300">
              WORK MODULES
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              ระบบงานทั้งหมด
            </h2>
          </div>

          <p className="hidden text-xs text-slate-500 sm:block">
            เลือกระบบงานที่ต้องการดำเนินการ
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {systemModules.map((module) => (
            <SystemCard
              key={module.id}
              module={module}
              onOpen={openModule}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

interface StatusBoxProps {
  icon: typeof Activity;
  value: string;
  label: string;
  color: string;
}

function StatusBox({
  icon: Icon,
  value,
  label,
  color,
}: StatusBoxProps) {
  return (
    <div className="min-w-32 rounded-xl border border-white/[0.07] bg-white/[0.035] p-4">
      <Icon size={17} className={color} />

      <p className={`mt-4 text-xl font-semibold ${color}`}>
        {value}
      </p>

      <p className="mt-1 text-[10px] text-slate-500">
        {label}
      </p>
    </div>
  );
}