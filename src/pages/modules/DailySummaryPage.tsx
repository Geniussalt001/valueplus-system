import {
  useState,
} from "react";

import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Gift,
  Truck,
} from "lucide-react";

import {
  ExpressSummaryPage,
} from "./express/ExpressSummaryPage";

import {
  DollSummaryPage,
} from "./doll/DollSummaryPage";

interface DailySummaryPageProps {
  onBack: () => void;
}

type SummaryMode =
  | "express"
  | "doll";

export function DailySummaryPage({
  onBack,
}: DailySummaryPageProps) {
  const [selectedMode, setSelectedMode] =
    useState<SummaryMode | null>(null);

  if (selectedMode === "express") {
    return (
      <ExpressSummaryPage
        onBack={() => {
          setSelectedMode(null);
        }}
      />
    );
  }

  if (selectedMode === "doll") {
    return (
      <DollSummaryPage
        onBack={() => {
          setSelectedMode(null);
        }}
      />
    );
  }

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
            DAILY SUMMARY
          </p>

          <h2 className="mt-2 text-3xl font-semibold text-white">
            สรุปยอดรายวัน
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            เลือกประเภทงานที่ต้องการสรุปยอด
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-600/30 bg-cyan-100/70 text-cyan-700">
          <BarChart3 size={23} />
        </div>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setSelectedMode("express");
          }}
          className="summary-choice summary-choice-express group relative min-h-[280px] overflow-hidden rounded-3xl p-8 text-left transition duration-300 hover:-translate-y-1"
        >
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl transition group-hover:bg-white/20" />

          <div className="summary-choice-icon relative flex h-16 w-16 items-center justify-center rounded-2xl border">
            <Truck size={30} />
          </div>

          <div className="relative mt-12">
            <p className="summary-choice-eyebrow text-[10px] font-semibold tracking-[0.22em]">
              EXPRESS SUMMARY
            </p>

            <h3 className="mt-3 text-2xl font-semibold">
              สรุปยอด Express
            </h3>

            <p className="summary-choice-description mt-4 text-sm leading-6">
              เลือกเพื่อเข้าสู่กระบวนการสรุปยอด Express
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedMode("doll");
          }}
          className={`
            summary-choice
            summary-choice-doll
            group
            relative
            min-h-[280px]
            overflow-hidden
            rounded-3xl
            p-8
            text-left
            transition
            duration-300
            hover:-translate-y-1
            ${selectedMode === "doll" ? "summary-choice-selected" : ""}
          `}
        >
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl transition group-hover:bg-white/20" />

          <div className="summary-choice-icon relative flex h-16 w-16 items-center justify-center rounded-2xl border">
            <Gift size={30} />
          </div>

          <div className="relative mt-12">
            <p className="summary-choice-eyebrow text-[10px] font-semibold tracking-[0.22em]">
              DOLL SUMMARY
            </p>

            <div className="mt-3 flex items-center justify-between gap-4">
              <h3 className="text-2xl font-semibold">
                สรุปยอดตุ๊กตา
              </h3>

              {selectedMode === "doll" && (
                <CheckCircle2 size={24} />
              )}
            </div>

            <p className="summary-choice-description mt-4 text-sm leading-6">
              เลือกเพื่อเข้าสู่กระบวนการสรุปยอดตุ๊กตา
            </p>
          </div>
        </button>
      </section>
    </div>
  );
}
