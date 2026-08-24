import { useState } from "react";

import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  FilePlus2,
  FileSpreadsheet,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { salesCnSummaryService } from "../../services/salesCnSummaryService";
import type { SalesCnSummaryResult } from "../../types/salesCnSummary.types";

interface SalesCnSummaryPageProps {
  onBack: () => void;
}

const numberFormat = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 2,
});

export function SalesCnSummaryPage({ onBack }: SalesCnSummaryPageProps) {
  const [result, setResult] = useState<SalesCnSummaryResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const addData = async () => {
    const sourcePath = await salesCnSummaryService.selectSource();
    if (!sourcePath) return;

    setProcessing(true);
    setError("");
    try {
      setResult(await salesCnSummaryService.process(sourcePath));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="vp-work-page mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
      <header className="vp-page-header flex flex-col justify-between gap-5 md:flex-row md:items-end">
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
            SALES / CN SUMMARY
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            สรุปยอดขาย ยอด CN และยอดสุทธิ
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            เพิ่มไฟล์รอบใหม่ แล้วระบบจะรวมข้อมูลลงรายงานหลัก สร้างชีตเดือนใหม่
            ปรับ Dashboard และข้ามรายการที่เคยนำเข้าแล้วโดยอัตโนมัติ
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-600/30 bg-cyan-100/70 text-cyan-700">
          <BarChart3 size={23} />
        </div>
      </header>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700">
              <FilePlus2 size={24} />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">เพิ่มข้อมูลรอบใหม่</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                เลือกไฟล์ .xlsx ที่มีรายการ IVVPR และ SR ระบบจะใช้เฉพาะสินค้า 19 รายการที่กำหนดไว้
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={processing}
            onClick={() => void addData()}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-700 px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-wait disabled:opacity-70"
          >
            {processing ? <LoaderCircle className="animate-spin" size={19} /> : <FileSpreadsheet size={19} />}
            {processing ? "กำลังตรวจข้อมูลและอัปเดตรายงาน..." : "เพิ่มข้อมูล"}
          </button>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-7">
          <div className="flex items-center gap-3 text-emerald-800">
            <ShieldCheck size={23} />
            <h3 className="font-semibold">ระบบป้องกันข้อมูลซ้ำ</h3>
          </div>
          <p className="mt-4 text-sm leading-6 text-emerald-900/75">
            รายงานหลักเก็บรหัสตรวจสอบของแต่ละรายการไว้ในชีตระบบที่ซ่อนอยู่
            หากเลือกไฟล์เดิมอีกครั้ง ระบบจะไม่นำยอดเดิมมาบวกซ้ำ
          </p>
          <p className="mt-4 rounded-xl bg-white/75 px-4 py-3 text-xs leading-5 text-slate-600">
            ไฟล์รายงานจะอยู่ที่ Desktop › รายงานยอดขาย CN › ValuePlus_Sales_CN_Summary.xlsx
          </p>
        </div>
      </section>

      {result ? (
        <>
          <section className="mt-6 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 text-emerald-600" size={22} />
                <div>
                  <h3 className="font-semibold text-slate-900">อัปเดตรายงานเรียบร้อย</h3>
                  <p className="mt-1 text-sm text-slate-600">{result.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void salesCnSummaryService.openReport(result.reportPath)}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700"
              >
                <FolderOpen size={17} />
                เปิดไฟล์รายงาน
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ResultCard label="เพิ่มใหม่" value={numberFormat.format(result.addedRows)} />
              <ResultCard label="ข้ามข้อมูลซ้ำ" value={numberFormat.format(result.skippedRows)} />
              <ResultCard label="รายการสะสม" value={numberFormat.format(result.totalRows)} />
              <ResultCard label="จำนวนเดือน" value={numberFormat.format(result.months.length)} />
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-red-700">PRODUCT SUMMARY</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">สรุปสินค้า 19 รายการ</h3>
              </div>
              <span className="flex items-center gap-2 text-xs text-slate-500">
                <RefreshCw size={14} />
                {result.months.join(" • ")}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-red-800 text-white">
                  <tr>
                    <th className="px-5 py-3 text-left">รหัสสินค้า</th>
                    <th className="px-5 py-3 text-left">สินค้า</th>
                    <th className="px-5 py-3 text-right">ยอดขาย</th>
                    <th className="px-5 py-3 text-right">ยอด CN</th>
                    <th className="px-5 py-3 text-right">ยอดสุทธิ</th>
                  </tr>
                </thead>
                <tbody>
                  {result.productSummary.map((item) => (
                    <tr key={item.productCode} className="border-b border-slate-100 even:bg-slate-50/70">
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-700">{item.productCode}</td>
                      <td className="min-w-[330px] px-5 py-3 text-slate-700">{item.productName}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{numberFormat.format(item.sales)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-orange-700">{numberFormat.format(item.cn)}</td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-emerald-700">{numberFormat.format(item.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
