import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  FileClock,
  FileSpreadsheet,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";

import {
  monthlySalesService,
} from "../../services/monthlySalesService";

import type {
  MonthlySalesPreview,
  MonthlySalesSummary,
  MonthlySalesTrend,
} from "../../types/monthlySales.types";

interface MonthlySalesPageProps {
  onBack: () => void;
}

const numberFormat = new Intl.NumberFormat(
  "th-TH",
  { maximumFractionDigits: 0 },
);

const percentFormat = new Intl.NumberFormat(
  "th-TH",
  {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
);

function formatNumber(value: number) {
  return numberFormat.format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "–";
  const [year, month, day] =
    value.slice(0, 10).split("-");
  return day
    ? `${day}/${month}/${year}`
    : value;
}

function TrendChart({
  months,
}: {
  months: MonthlySalesTrend[];
}) {
  const width = 920;
  const height = 260;
  const left = 58;
  const right = 52;
  const top = 24;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxMain = Math.max(
    1,
    ...months.flatMap((item) => [
      item.sales,
      item.net,
    ]),
  );
  const maxCn = Math.max(
    1,
    ...months.map((item) => item.cn),
  );
  const x = (index: number) =>
    left +
    (months.length === 1
      ? plotWidth / 2
      : (index * plotWidth) /
        (months.length - 1));
  const mainY = (value: number) =>
    top +
    plotHeight -
    (value / maxMain) * plotHeight;
  const cnY = (value: number) =>
    top +
    plotHeight -
    (value / maxCn) * plotHeight;
  const path = (
    field: "sales" | "net" | "cn",
    useCnScale = false,
  ) =>
    months
      .map((item, index) =>
        `${index ? "L" : "M"} ${x(index)} ${
          useCnScale
            ? cnY(item[field])
            : mainY(item[field])
        }`,
      )
      .join(" ");

  if (!months.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        ยังไม่มีข้อมูลสำหรับแสดงกราฟ
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[720px]"
        role="img"
        aria-label="กราฟแนวโน้มยอดขาย CN และยอดสุทธิรายเดือน"
      >
        {[0, 0.25, 0.5, 0.75, 1].map(
          (ratio) => {
            const y = top + plotHeight * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={left}
                  y1={y}
                  x2={width - right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 5"
                />
                <text
                  x={left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                >
                  {formatNumber(
                    maxMain * (1 - ratio),
                  )}
                </text>
                <text
                  x={width - right + 10}
                  y={y + 4}
                  fontSize="10"
                  fill="#b51632"
                >
                  {formatNumber(
                    maxCn * (1 - ratio),
                  )}
                </text>
              </g>
            );
          },
        )}

        <path d={path("sales")} fill="none" stroke="#356bc4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path("net")} fill="none" stroke="#159b82" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path("cn", true)} fill="none" stroke="#b51632" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 5" />

        {months.map((item, index) => (
          <g key={item.key}>
            <circle cx={x(index)} cy={mainY(item.sales)} r="4" fill="#356bc4">
              <title>{`${item.monthName}: ยอดขาย ${formatNumber(item.sales)}`}</title>
            </circle>
            <circle cx={x(index)} cy={mainY(item.net)} r="4" fill="#159b82">
              <title>{`${item.monthName}: สุทธิ ${formatNumber(item.net)}`}</title>
            </circle>
            <circle cx={x(index)} cy={cnY(item.cn)} r="4" fill="#b51632">
              <title>{`${item.monthName}: CN ${formatNumber(item.cn)}`}</title>
            </circle>
            <text x={x(index)} y={height - 14} textAnchor="middle" fontSize="11" fill="#64748b">
              {item.monthName.slice(0, 3)}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-1 flex flex-wrap justify-center gap-5 text-xs text-slate-600">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#356bc4]" />ยอดขาย (แกนซ้าย)</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#159b82]" />ยอดสุทธิ (แกนซ้าย)</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#b51632]" />CN (แกนขวา)</span>
      </div>
    </div>
  );
}

export function MonthlySalesPage({
  onBack,
}: MonthlySalesPageProps) {
  const [summary, setSummary] =
    useState<MonthlySalesSummary | null>(null);
  const [preview, setPreview] =
    useState<MonthlySalesPreview | null>(null);
  const [csvPath, setCsvPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSummary = useCallback(
    async (selectedMonth?: string | null) => {
      setLoading(true);
      setError("");
      try {
        setSummary(
          await monthlySalesService.getSummary(
            selectedMonth,
          ),
        );
      } catch (reason) {
        setError(String(reason));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const selected = summary?.selected;
  const selectedLabel = useMemo(
    () =>
      selected
        ? `${selected.monthName} ${selected.year}`
        : "ยังไม่มีข้อมูล",
    [selected],
  );

  const chooseCsv = async () => {
    setError("");
    setSuccess("");
    const selectedPath =
      await monthlySalesService.selectCsv();
    if (!selectedPath) return;
    setWorking(true);
    try {
      setCsvPath(selectedPath);
      setPreview(
        await monthlySalesService.preview(
          selectedPath,
        ),
      );
    } catch (reason) {
      setError(String(reason));
    } finally {
      setWorking(false);
    }
  };

  const confirmImport = async () => {
    if (!csvPath || !preview) return;
    setWorking(true);
    setError("");
    setSuccess("");
    try {
      const nextSummary =
        await monthlySalesService.importCsv(
          csvPath,
        );
      setSummary(nextSummary);
      setPreview(null);
      setCsvPath("");
      setSuccess(
        `อัปเดตข้อมูล ${preview.monthName} ${preview.year} และไฟล์ Excel เรียบร้อยแล้ว`,
      );
    } catch (reason) {
      setError(String(reason));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="vp-work-page mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
      <header className="vp-page-header flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <button type="button" onClick={onBack} className="mb-5 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-[#b51632]">
            <ArrowLeft size={17} />
            กลับหน้าลงยอดรายวัน
          </button>
          <p className="text-[10px] font-semibold tracking-[0.24em] text-[#b51632]">MONTHLY SALES POSTING</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">ลงยอดขายรายเดือน</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            นำเข้า CSV แบบสะสมรายเดือน ระบบจะอัปเดตฐานข้อมูล แดชบอร์ด และไฟล์ Excel ให้ตรงกันอัตโนมัติ
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void loadSummary(summary?.selectedMonth)} disabled={loading || working} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw size={17} />รีเฟรช
          </button>
          <button type="button" onClick={chooseCsv} disabled={working} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#b51632] bg-[#b51632] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#971229] disabled:cursor-not-allowed disabled:opacity-50">
            {working ? <LoaderCircle size={17} className="animate-spin" /> : <Upload size={17} />}
            อัปโหลด CSV
          </button>
        </div>
      </header>

      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">{error}</div>}
      {success && <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800"><CheckCircle2 size={18} />{success}</div>}

      {preview && (
        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-700">ตรวจสอบก่อนอัปเดต</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{preview.sourceFile} · {preview.monthName} {preview.year}</h3>
              <p className="mt-2 text-sm text-slate-600">ข้อมูลถึงวันที่ {formatDate(preview.periodEnd)} · {formatNumber(preview.transactionCount)} รายการ</p>
            </div>
            <button type="button" onClick={() => { setPreview(null); setCsvPath(""); }} className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200 bg-white text-slate-500 transition-colors hover:bg-amber-100" aria-label="ปิดตัวอย่าง"><X size={17} /></button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {([
              ["ยอดขาย", preview.sales, preview.difference.sales, "#356bc4"],
              ["CN", preview.cn, preview.difference.cn, "#b51632"],
              ["ยอดสุทธิ", preview.net, preview.difference.net, "#159b82"],
            ] as Array<[string, number, number, string]>).map(([label, value, difference, color]) => (
              <div key={label} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold" style={{ color }}>{formatNumber(value)}</p>
                <p className="mt-1 text-xs text-slate-500">เทียบข้อมูลเดิม {difference >= 0 ? "+" : ""}{formatNumber(difference)}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-sm leading-6 text-slate-700">
              {preview.duplicate
                ? "ไฟล์นี้ถูกนำเข้าแล้ว จึงไม่บันทึกซ้ำ"
                : preview.olderThanStored
                  ? "ไฟล์นี้เก่ากว่าข้อมูลในระบบ จึงไม่อนุญาตให้เขียนทับ"
                  : preview.replacesExistingMonth
                    ? "เมื่อยืนยัน ระบบจะแทนที่ข้อมูลเดือนนี้ทั้งหมด แล้วคำนวณแดชบอร์ดและ Excel ใหม่"
                    : "เมื่อยืนยัน ระบบจะเพิ่มเดือนนี้ แล้วคำนวณแดชบอร์ดและ Excel ใหม่"}
            </p>
            <button type="button" onClick={confirmImport} disabled={working || preview.duplicate || preview.olderThanStored} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#159b82] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#11806c] disabled:cursor-not-allowed disabled:opacity-50">
              {working ? <LoaderCircle size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
              ยืนยันและอัปเดตทั้งหมด
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="mt-10 flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white"><LoaderCircle size={30} className="animate-spin text-[#b51632]" /></div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5"><p className="text-xs text-slate-500">ยอดขาย · {selectedLabel}</p><p className="mt-3 text-2xl font-semibold text-[#356bc4]">{formatNumber(selected?.sales || 0)}</p></div>
            <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5"><p className="text-xs text-slate-500">CN · {selectedLabel}</p><p className="mt-3 text-2xl font-semibold text-[#b51632]">{formatNumber(selected?.cn || 0)}</p><p className="mt-1 text-xs text-slate-500">{percentFormat.format(selected?.cnRate || 0)} ของยอดขาย</p></div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5"><p className="text-xs text-slate-500">ยอดสุทธิ · {selectedLabel}</p><p className="mt-3 text-2xl font-semibold text-[#159b82]">{formatNumber(selected?.net || 0)}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">ยอดสุทธิสะสมทุกเดือน</p><p className="mt-3 text-2xl font-semibold text-slate-900">{formatNumber(summary?.totals.net || 0)}</p><p className="mt-1 text-xs text-slate-500">ข้อมูลถึง {formatDate(selected?.periodEnd)}</p></div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div><p className="text-[10px] font-semibold tracking-[0.2em] text-[#356bc4]">MONTHLY TREND</p><h3 className="mt-2 text-lg font-semibold text-slate-900">แนวโน้มยอดขายรายเดือน</h3></div>
                <select value={summary?.selectedMonth || ""} onChange={(event) => void loadSummary(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-[#356bc4]">
                  {summary?.months.map((month) => <option key={month.key} value={month.key}>{month.monthName} {month.year}</option>)}
                </select>
              </div>
              <div className="mt-5"><TrendChart months={summary?.months || []} /></div>
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-[#b51632]"><FileSpreadsheet size={22} /></div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">ไฟล์สรุปล่าสุด</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">ระบบสร้างชีต Dashboard สรุปรวม ฐานข้อมูล และชีตแยกเดือนใหม่ทุกครั้งที่นำเข้า</p>
              <button type="button" disabled={!summary?.workbookPath} onClick={() => void monthlySalesService.openWorkbook(summary?.workbookPath || "")} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#b51632] bg-white text-sm font-semibold text-[#b51632] transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"><FolderOpen size={17} />เปิดไฟล์ Excel</button>
              <div className="mt-5 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500"><p>ไฟล์ต้นทาง: {selected?.sourceFile || "ข้อมูลเริ่มต้น"}</p><p className="mt-1">จำนวนรายการ: {selected?.transactionCount ? formatNumber(selected.transactionCount) : "–"}</p></div>
            </aside>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center"><div><p className="text-[10px] font-semibold tracking-[0.2em] text-[#159b82]">PRODUCT PERFORMANCE</p><h3 className="mt-2 text-lg font-semibold text-slate-900">สรุปรายการสินค้า · {selectedLabel}</h3></div><span className="text-xs text-slate-500">{summary?.products.length || 0} รายการสินค้า</span></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-6 py-3 font-semibold">สินค้า</th><th className="px-4 py-3 text-right font-semibold">ยอดขาย</th><th className="px-4 py-3 text-right font-semibold">CN</th><th className="px-4 py-3 text-right font-semibold">ยอดสุทธิ</th><th className="px-4 py-3 text-right font-semibold">% CN</th><th className="px-4 py-3 text-right font-semibold">สัดส่วน</th><th className="px-6 py-3 text-right font-semibold">เทียบเดือนก่อน</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {summary?.products.map((product) => (
                    <tr key={product.productCode} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4"><p className="font-semibold text-slate-800">{product.name}</p><p className="mt-1 text-xs text-slate-400">{product.productCode} · {product.sourceCode}</p></td>
                      <td className="px-4 py-4 text-right font-semibold text-[#356bc4]">{formatNumber(product.sales)}</td><td className="px-4 py-4 text-right font-semibold text-[#b51632]">{formatNumber(product.cn)}</td><td className="px-4 py-4 text-right font-semibold text-[#159b82]">{formatNumber(product.net)}</td><td className="px-4 py-4 text-right text-slate-600">{percentFormat.format(product.cnRate)}</td><td className="px-4 py-4 text-right text-slate-600">{percentFormat.format(product.salesShare)}</td>
                      <td className={`px-6 py-4 text-right font-semibold ${product.change >= 0 ? "text-emerald-700" : "text-red-700"}`}><span className="inline-flex items-center justify-end gap-1.5">{product.change >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}{product.change >= 0 ? "+" : ""}{formatNumber(product.change)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3"><FileClock size={20} className="text-[#b51632]" /><h3 className="text-lg font-semibold text-slate-900">ประวัติการอัปโหลด</h3></div>
            {summary?.history.length ? <div className="mt-5 grid gap-3 lg:grid-cols-2">{summary.history.map((item) => <div key={`${item.sourceHash}-${item.importedAt}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{item.sourceFile}</p><p className="mt-1 text-xs text-slate-500">{item.monthName} · ข้อมูลถึง {formatDate(item.periodEnd)} · {formatNumber(item.transactionCount)} รายการ</p></div><CheckCircle2 size={18} className="shrink-0 text-emerald-600" /></div>)}</div> : <p className="mt-4 text-sm text-slate-500">ยังไม่มีประวัติการอัปโหลดในเครื่องนี้</p>}
          </section>
        </>
      )}

      <div className="mt-6 flex items-center gap-2 text-xs text-slate-400"><BarChart3 size={14} />ข้อมูลในระบบและไฟล์ Excel ใช้ฐานข้อมูลเดียวกัน จึงอัปเดตพร้อมกันทุกครั้ง</div>
    </div>
  );
}
