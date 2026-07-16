import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileSearch,
} from "lucide-react";

import type { PoRecord } from "./poData.types";

export function PoDataStats({
  records,
}: {
  records: PoRecord[];
}) {
  const waiting = records.filter(
    (item) => item.status === "waiting",
  ).length;

  const reviewing = records.filter(
    (item) => item.status === "reviewing",
  ).length;

  const complete = records.filter(
    (item) => item.status === "complete",
  ).length;

  const issue = records.filter(
    (item) => item.status === "issue",
  ).length;

  const statistics = [
    {
      label: "รอเอกสาร",
      value: waiting,
      icon: Clock3,
      color: "text-amber-300",
      background: "bg-amber-300/10",
    },
    {
      label: "กำลังตรวจสอบ",
      value: reviewing,
      icon: FileSearch,
      color: "text-cyan-300",
      background: "bg-cyan-300/10",
    },
    {
      label: "สมบูรณ์",
      value: complete,
      icon: CheckCircle2,
      color: "text-emerald-300",
      background: "bg-emerald-300/10",
    },
    {
      label: "พบปัญหา",
      value: issue,
      icon: AlertTriangle,
      color: "text-red-300",
      background: "bg-red-300/10",
    },
  ];

  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statistics.map((statistic) => {
        const Icon = statistic.icon;

        return (
          <article
            key={statistic.label}
            className="rounded-2xl border border-white/[0.06] bg-[#061525]/75 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.16)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500">
                  {statistic.label}
                </p>

                <p
                  className={`mt-3 text-3xl font-semibold ${statistic.color}`}
                >
                  {statistic.value}
                </p>
              </div>

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${statistic.background}`}
              >
                <Icon
                  size={20}
                  className={statistic.color}
                />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}