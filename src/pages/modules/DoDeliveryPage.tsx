import { useState } from "react";
import { AlertTriangle, ArrowLeft, Boxes, Building2, CheckCircle2, CloudUpload, ExternalLink, FileSearch, FolderOpen, LoaderCircle, MapPinned, PackageOpen, Route, Store } from "lucide-react";

import { doDeliveryService } from "../../services/doDeliveryService";
import type { DoDeliveryResult, DoDeliverySaveResult } from "../../types/doDelivery.types";

const formatNumber = (value: number) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
const fileName = (path: string) => path.split(/[\\/]/).pop() || path;

export function DoDeliveryPage({ onBack }: { onBack: () => void }) {
  const [pdfPaths, setPdfPaths] = useState<string[]>([]);
  const [result, setResult] = useState<DoDeliveryResult | null>(null);
  const [saved, setSaved] = useState<DoDeliverySaveResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectFiles = async () => {
    const selected = await doDeliveryService.selectPdfFiles();
    if (!selected.length) return;
    setPdfPaths(selected); setResult(null); setSaved(null); setError("");
  };
  const preview = async () => {
    if (!pdfPaths.length) return;
    setBusy(true); setError("");
    try { setResult(await doDeliveryService.preview({ pdfPaths })); }
    catch (reason) { setError(String(reason)); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!result) return;
    setBusy(true); setError("");
    try { setSaved(await doDeliveryService.save(result)); }
    catch (reason) { setError(String(reason)); }
    finally { setBusy(false); }
  };

  return <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8 lg:py-9">
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <div className="border-l-4 border-teal-500 px-7 py-7 lg:px-9">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-900"><ArrowLeft size={17} /> กลับเมนูลงยอด</button>
        <div className="mt-7 flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><MapPinned size={27} /></span><div><p className="text-[10px] font-semibold tracking-[0.24em] text-teal-600">DO DELIVERY ANALYTICS</p><h2 className="mt-1 text-3xl font-bold text-slate-900">วิเคราะห์ยอดจัดส่ง DO</h2><p className="mt-1 text-sm text-slate-500">อ่านใบคุมส่งสินค้า วิเคราะห์คลัง สายรถ สาขา และสินค้า</p></div></div>
      </div>
    </section>

    <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><PackageOpen size={21} /></span><div><h3 className="font-bold text-slate-900">ไฟล์ ReportDOByRoute</h3><p className="text-xs text-slate-500">เลือก PDF ได้หลายคลังและหลายเส้นทางพร้อมกัน</p></div></div><button type="button" onClick={selectFiles} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/50 px-5 py-8 text-sm font-semibold text-teal-700 hover:border-teal-400"><FolderOpen size={20} /> {pdfPaths.length ? `เลือกแล้ว ${pdfPaths.length} ไฟล์` : "เลือกไฟล์ DO"}</button>{pdfPaths.length ? <div className="mt-4 flex max-h-28 flex-wrap gap-2 overflow-auto">{pdfPaths.map((path) => <span key={path} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">{fileName(path)}</span>)}</div> : null}</div>
      <div className="flex flex-col justify-end gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><button type="button" disabled={!pdfPaths.length || busy} onClick={preview} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-6 py-3.5 text-sm font-bold text-white disabled:opacity-40">{busy ? <LoaderCircle className="animate-spin" size={18} /> : <FileSearch size={18} />} ประมวลผลและ Preview</button><button type="button" disabled={!result || busy} onClick={save} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white disabled:opacity-40"><CloudUpload size={18} /> บันทึกฐานข้อมูล DO</button></div>
    </section>

    {error ? <div className="mt-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle size={19} />{error}</div> : null}
    {saved ? <section className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center"><div className="flex gap-3"><CheckCircle2 className="text-emerald-600" size={21} /><div><h4 className="font-bold text-emerald-900">บันทึกฐานข้อมูล DO สำเร็จ</h4><p className="text-xs text-emerald-700">เพิ่ม {formatNumber(saved.insertedCount)} แถว • ไฟล์ซ้ำ {saved.duplicateFileCount} • สาขารอระบุพื้นที่ {saved.unresolvedBranchCount}</p></div></div><button type="button" onClick={() => doDeliveryService.openSpreadsheet(saved.spreadsheetUrl)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700"><ExternalLink size={16} /> เปิด Google Sheet</button></section> : null}

    {result ? <>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric icon={Boxes} label="ยอดจัดส่ง" value={`${formatNumber(result.total_quantity)} ชิ้น`} /><Metric icon={Store} label="สาขา" value={`${formatNumber(result.branch_count)} แห่ง`} /><Metric icon={PackageOpen} label="สินค้า" value={`${result.product_count} รายการ`} /><Metric icon={Building2} label="คลัง" value={`${result.warehouses.length} แห่ง`} /><Metric icon={Route} label="รายการข้อมูล" value={formatNumber(result.record_count)} /></section>
      <section className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Ranking title="10 สาขาที่รับสินค้าสูงสุด" rows={result.top_branches.slice(0, 10).map((item) => ({ code: item.branch_code, name: item.branch_name, value: item.quantity }))} />
        <Ranking title="ยอดจัดส่งแยกตามคลัง" rows={result.warehouses.map((item) => ({ code: item.warehouse_code, name: "คลังจัดส่ง", value: item.quantity }))} />
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[.85fr_1.15fr]"><div className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-6"><div className="flex items-center gap-3"><MapPinned className="text-teal-700" /><div><h3 className="font-bold text-slate-900">แผนที่ยอดจัดส่ง</h3><p className="text-xs text-slate-500">พร้อมเชื่อมจังหวัดและภูมิภาค</p></div></div><div className="mt-6 grid grid-cols-2 gap-3">{["ภาคเหนือ", "ภาคกลาง", "ภาคตะวันออกเฉียงเหนือ", "ภาคใต้"].map((region) => <div key={region} className="rounded-2xl border border-white bg-white/80 p-4"><p className="text-xs text-slate-500">{region}</p><p className="mt-2 font-bold text-slate-800">รอจับคู่สาขา</p></div>)}</div><p className="mt-5 text-xs leading-5 text-teal-800">เติมจังหวัดและภาคในชีต “ข้อมูลสาขา” แล้วระบบจะจัดอันดับพื้นที่ให้โดยอัตโนมัติ</p></div><Ranking title="10 สินค้าที่จัดส่งสูงสุด" rows={result.top_products.slice(0, 10).map((item) => ({ code: item.product_code, name: item.product_name || "รอชื่อสินค้า", value: item.quantity }))} /></section>
    </> : null}
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Boxes; label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon size={19} className="text-teal-600" /><p className="mt-4 text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>; }
function Ranking({ title, rows }: { title: string; rows: { code: string; name: string; value: number }[] }) { const max = Math.max(...rows.map((row) => row.value), 1); return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-6 py-5"><h3 className="font-bold text-slate-900">{title}</h3></div><div className="max-h-[430px] overflow-auto p-4">{rows.map((row, index) => <div key={`${row.code}-${index}`} className="mb-2 rounded-2xl border border-slate-100 p-3"><div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className="truncate text-sm font-semibold text-slate-800">{row.name}</p><p className="shrink-0 text-sm font-bold text-teal-700">{formatNumber(row.value)}</p></div><p className="text-[11px] text-slate-400">{row.code}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${(row.value / max) * 100}%` }} /></div></div></div></div>)}</div></div>; }
