import {
  Activity,
  Boxes,
  Building2,
  CalendarDays,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

import {
  SystemCard,
} from "../components/SystemCard";

import {
  systemModules,
} from "../data/systemModules";

import type {
  SystemModule,
  WorkspaceScope,
  WorkRoute,
} from "../types/app";

interface DashboardPageProps {
  workspaceScope: WorkspaceScope;
  onNavigate: (
    route: WorkRoute,
  ) => void;
}

export function DashboardPage({
  workspaceScope,
  onNavigate,
}: DashboardPageProps) {
  const availableModules =
    systemModules.filter(
      (module) =>
        module.workspaces.includes(
          workspaceScope,
        ),
    );

  const onlineCount =
    availableModules.filter(
      (module) =>
        module.status === "online",
    ).length;

  const availability =
    availableModules.length > 0
      ? Math.round(
          (onlineCount /
            availableModules.length) *
            100,
        )
      : 0;

  const openModule = (
    module: SystemModule,
  ) => {
    onNavigate(module.route);
  };

  const workspaceTitle =
    workspaceScope === "retail"
      ? "ระบบงานฝั่ง Retail"
      : "ระบบงานสำนักงานใหญ่";

  const WorkspaceIcon =
    workspaceScope === "retail"
      ? ShoppingBag
      : Building2;

  const today =
    new Intl.DateTimeFormat(
      "th-TH",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      },
    ).format(new Date());

  return (
    <div className="dashboard-home mx-auto max-w-[1600px] px-5 py-6 lg:px-8 lg:py-8">
      <section className="dashboard-heading mb-6">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-blue-600">
          VALUEPLUS CONTROL CENTER
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] lg:text-3xl">
          Dashboard ภาพรวม
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          ภาพรวมระบบงาน เอกสาร และสถานะการให้บริการ
        </p>
      </section>

      <section className="dashboard-metric-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Boxes}
          value={String(availableModules.length)}
          label="ระบบงานทั้งหมด"
          detail={`${onlineCount} ระบบพร้อมใช้งาน`}
          variant="violet"
        />
        <MetricCard
          icon={Activity}
          value={`${availability}%`}
          label="ความพร้อมของระบบ"
          detail="สถานะการให้บริการปัจจุบัน"
          variant="teal"
        />
        <MetricCard
          icon={WorkspaceIcon}
          value={workspaceScope === "retail" ? "Retail" : "HQ"}
          label="พื้นที่ทำงาน"
          detail={workspaceTitle}
          variant="pink"
        />
        <MetricCard
          icon={CalendarDays}
          value={today}
          label="วันที่ใช้งาน"
          detail="LIVE DATA"
          variant="cyan"
        />
      </section>

      <section className="dashboard-module-panel mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="dashboard-module-header flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-cyan-300">
              WORK MODULES
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              {workspaceTitle}
            </h2>
          </div>

          <div className="dashboard-readiness flex items-center gap-3 rounded-xl px-4 py-2.5">
            <ShieldCheck size={17} />
            <span className="text-xs font-semibold">พร้อมใช้งาน {onlineCount}/{availableModules.length}</span>
          </div>
        </div>

        <div className="module-grid grid gap-5 p-6 md:grid-cols-2 2xl:grid-cols-3">
          {availableModules.map(
            (module) => (
              <SystemCard
                key={module.id}
                module={module}
                onOpen={openModule}
              />
            ),
          )}
        </div>
      </section>
    </div>
  );
}

interface MetricCardProps {
  icon: typeof Activity;
  value: string;
  label: string;
  detail: string;
  variant: "violet" | "teal" | "pink" | "cyan";
}

function MetricCard({
  icon: Icon,
  value,
  label,
  detail,
  variant,
}: MetricCardProps) {
  return (
    <div className={`dashboard-metric dashboard-metric-${variant} relative overflow-hidden rounded-2xl p-5 text-white`}>
      <div className="dashboard-metric-orb" aria-hidden="true" />
      <span className="dashboard-metric-icon flex h-10 w-10 items-center justify-center rounded-xl">
        <Icon size={19} />
      </span>
      <p className="mt-4 text-xs font-medium text-white/80">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      <p className="mt-2 text-[11px] text-white/75">{detail}</p>
    </div>
  );
}
