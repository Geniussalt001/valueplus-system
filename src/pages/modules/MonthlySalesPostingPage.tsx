import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CalendarRange, CheckCircle2, FileSpreadsheet, FolderOpen, LoaderCircle, PackageSearch, Save } from "lucide-react";

import { monthlySalesService } from "../../services/monthlySalesService";
import type { MonthlySalesResult } from "../../types/monthlySales.types";

interface MonthlySalesPostingPageProps { onBack: () => void; }

const formatNumber = (value: number) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
const fileName = (path: string) => path.split(/[\\/]/).pop() || path;

export function MonthlySalesPostingPage({ onBack }: MonthlySalesPostingPageProps) {
  const [csvPaths, setCsvPaths] = useState<string[]>([]);
  const [result, setResult] = useState<MonthlySalesResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const suggestedName = useMemo(() => {
    const month = result?.months[0];
    return month ? `สรุปยอดขาย-${month.month_name}-${month.buddhist_year}.xlsx` : "สรุปยอดขายรายเดือน.xlsx";
  }, [result]);

  const selectFiles = async () => {
    const selected = await monthlySalesService.selectCsvFiles();
    if (!selected.length) return;
    setCsvPaths(selected); setResult(null); setError("");
  };
  const preview = async () => {
    if (!csvPaths.length) return;
    setBusy(true); setError("");
    try { setResult(await monthlySalesService.preview({ csvPaths })); }
    catch (reason) { setError(String(reason)); }
    finally { setBusy(false); }
  };
  const exportExcel = async () => {
    if (!result) return;
    const outputPath = await monthlySalesService.selectOutputPath(suggestedName);
    if (!outputPath) return;
    setBusy(true); setError("");
    try {
      const processed = await monthlySalesService.process({ csvPaths, outputPath });
      setResult(processed);
      await monthlySalesService.openOutput(processed.output_path);
    } catch (reason) { setError(String(reason)); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-[1450px] px-5 py-7 lg:px-8 lg:py-9">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <div className="border-l-4 border-amber-500 px-7 py-7 lg:px-9">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-900"><ArrowLeft size={17} /> กลับเมนูลงยอดรายวัน</button>
          <div className="mt-7 flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><CalendarRange size={27} /></span>
            <div><p className="text-[10px] font-semibold tracking-[0.24em] text-amber-600">MONTHLY SALES POSTING</p><h2 className="mt-1 text-3xl font-bold text-slate-900">ลงยอดขายรายเดือน</h2><p className="mt-1 text-sm text-slate-500">นำเข้า CSV จากรายงานประวัติการขาย แยกยอดขายและ CN อัตโนมัติ</p></div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FileSpreadsheet size={21} /></span><div><h3 className="font-bold text-slate-900">ไฟล์ CSV จาก Express</h3><p className="text-xs text-slate-500">เลือกได้หลายไฟล์เพื่อรวมหลายเดือน</p></div></div>
          <button type="button" onClick={selectFiles} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-5 py-8 text-sm font-semibold text-blue-700 hover:border-blue-400"><FolderOpen size={20} /> {csvPaths.length ? "เลือกไฟล์ใหม่" : "เลือกไฟล์ CSV"}</button>
          {csvPaths.length ? <div className="mt-4 flex flex-wrap gap-2">{csvPaths.map((path) => <span key={path} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">{fileName(path)}</span>)}</div> : null}
        </div>
        <div className="flex min-w-[280px] flex-col justify-end gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <button type="button" disabled={!csvPaths.length || busy} onClick={preview} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-6 py-3.5 text-sm font-bold text-white disabled:opacity-40">{busy ? <LoaderCircle className="animate-spin" size={18} /> : <PackageSearch size={18} />} ประมวลผลและ Preview</button>
          <button type="button" disabled={!result || busy} onClick={exportExcel} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white disabled:opacity-40"><Save size={18} /> บันทึกไฟล์ Excel</button>
        </div>
      </section>

      {error ? <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle size={19} />{error}</div> : null}
      {result ? <>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="ยอดขาย" value={formatNumber(result.sales_total)} tone="blue" />
          <Metric label="CN" value={formatNumber(result.cn_total)} tone="orange" />
          <Metric label="ยอดสุทธิ" value={formatNumber(result.net_total)} tone="emerald" />
          <Metric label="ธุรกรรมที่ใช้" value={formatNumber(result.transaction_count)} tone="violet" />
          <Metric label="สินค้า" value={`${result.product_count} รายการ`} tone="cyan" />
        </section>
        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5"><div><h3 className="font-bold text-slate-900">สรุปตามเดือน</h3><p className="mt-1 text-xs text-slate-500">ยอดขาย − CN = ยอดสุทธิ</p></div><CheckCircle2 className="text-emerald-500" size={22} /></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-6 py-3">เดือน</th><th className="px-6 py-3 text-right">ยอดขาย</th><th className="px-6 py-3 text-right">CN</th><th className="px-6 py-3 text-right">ยอดสุทธิ</th></tr></thead><tbody>{result.months.map((month) => <tr key={`${month.year}-${month.month}`} className="border-t border-slate-100"><td className="px-6 py-4 font-semibold">{month.month_name} {month.buddhist_year}</td><td className="px-6 py-4 text-right text-blue-700">{formatNumber(month.sales)}</td><td className="px-6 py-4 text-right text-orange-600">{formatNumber(month.cn)}</td><td className="px-6 py-4 text-right font-bold text-emerald-700">{formatNumber(month.net)}</td></tr>)}</tbody></table></div>
        </section>
        {result.excluded_count ? <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><AlertTriangle className="shrink-0 text-amber-600" size={20} /><div><h4 className="font-bold text-amber-900">มี {formatNumber(result.excluded_count)} ธุรกรรมที่ไม่นำมาคำนวณ</h4><p className="mt-1 text-xs text-amber-700">เป็นรหัสสินค้าเก่าหรือยังไม่มีในฐานข้อมูล และจะแสดงรายละเอียดในไฟล์ Excel</p></div></div></section> : null}
      </> : null}
    </div>
  );
}

const metricStyles = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
};

function Metric({ label, value, tone }: { label: string; value: string; tone: keyof typeof metricStyles }) {
  return <div className={`rounded-2xl border p-5 ${metricStyles[tone]}`}><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>;
}
