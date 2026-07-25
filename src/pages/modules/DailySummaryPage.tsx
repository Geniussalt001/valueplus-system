import {
  useState,
} from "react";

import {
  ArrowLeft,
  BarChart3,
  Gift,
  PackageSearch,
  Truck,
} from "lucide-react";

import {
  ExpressSummaryPage,
} from "./express/ExpressSummaryPage";

import {
  DollSummaryPage,
} from "./doll/DollSummaryPage";

import {
  ProductCatalogPage,
} from "./product-catalog/ProductCatalogPage";

interface DailySummaryPageProps {
  onBack: () => void;
}

type SummaryMode =
  | "express"
  | "doll"
  | "catalog";

export function DailySummaryPage({
  onBack,
}: DailySummaryPageProps) {
  const [selectedMode, setSelectedMode] =
    useState<SummaryMode | null>(null);

  const backToSummaryMenu = () => {
    setSelectedMode(null);
  };

  if (selectedMode === "express") {
    return (
      <ExpressSummaryPage
        onBack={backToSummaryMenu}
      />
    );
  }

  if (selectedMode === "doll") {
    return (
      <DollSummaryPage
        onBack={backToSummaryMenu}
      />
    );
  }

  if (selectedMode === "catalog") {
    return (
      <ProductCatalogPage
        onBack={backToSummaryMenu}
        backLabel="กลับหน้าเลือกประเภทสรุปยอด"
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

          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            สรุปยอดรายวัน
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            เลือกประเภทงานสรุปยอด หรือจัดการรายการสินค้าที่ใช้ร่วมกัน
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-600/30 bg-cyan-100/70 text-cyan-700">
          <BarChart3 size={23} />
        </div>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
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
              เข้าสู่กระบวนการอ่านไฟล์และสรุปยอด Express
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedMode("doll");
          }}
          className="summary-choice summary-choice-doll group relative min-h-[280px] overflow-hidden rounded-3xl p-8 text-left transition duration-300 hover:-translate-y-1"
        >
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl transition group-hover:bg-white/20" />

          <div className="summary-choice-icon relative flex h-16 w-16 items-center justify-center rounded-2xl border">
            <Gift size={30} />
          </div>

          <div className="relative mt-12">
            <p className="summary-choice-eyebrow text-[10px] font-semibold tracking-[0.22em]">
              DOLL SUMMARY
            </p>

            <h3 className="mt-3 text-2xl font-semibold">
              สรุปยอดตุ๊กตา
            </h3>

            <p className="summary-choice-description mt-4 text-sm leading-6">
              เข้าสู่กระบวนการคีย์และสรุปยอดตุ๊กตา
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedMode("catalog");
          }}
          className="group relative min-h-[280px] overflow-hidden rounded-3xl border border-emerald-300 bg-gradient-to-br from-white via-emerald-50/70 to-cyan-50 p-8 text-left shadow-[0_20px_55px_rgba(5,150,105,0.10)] transition duration-300 hover:-translate-y-1 hover:border-emerald-400"
        >
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-100/70 blur-3xl transition group-hover:bg-emerald-200/80" />

          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300 bg-white/80 text-emerald-700">
            <PackageSearch size={30} />
          </div>

          <div className="relative mt-12">
            <p className="text-[10px] font-semibold tracking-[0.22em] text-emerald-700">
              PRODUCT CATALOG
            </p>

            <h3 className="mt-3 text-2xl font-semibold text-slate-900">
              จัดการข้อมูลสินค้า
            </h3>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              เพิ่ม แก้ไข เปิด ปิด และกำหนดชื่อสินค้าที่ใช้ในงานสรุปยอด
            </p>
          </div>
        </button>
      </section>
    </div>
  );
}
