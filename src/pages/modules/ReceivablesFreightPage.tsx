import {
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  LoaderCircle,
  ScanSearch,
  Sheet,
  Upload,
} from "lucide-react";

import {
  receivablesFreightService,
  receivablesTemplateUrl,
} from "../../services/receivablesFreightService";

import type {
  ReceivablesFreightResult,
} from "../../types/receivablesFreight.types";

interface ReceivablesFreightPageProps {
  onBack: () => void;
}

export function ReceivablesFreightPage({
  onBack,
}: ReceivablesFreightPageProps) {
  const [csvPath, setCsvPath] =
    useState("");
  const [result, setResult] =
    useState<ReceivablesFreightResult | null>(null);
  const [busy, setBusy] =
    useState<"" | "selecting" | "previewing" | "exporting">("");
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  const canExport = Boolean(
    result &&
      result.record_count > 0 &&
      result.review_count === 0 &&
      result.error_count === 0,
  );

  const suggestedName = useMemo(() => {
    const date = result?.records[0]?.date
      ?.replaceAll("/", ".") ?? "ผลลัพธ์";

    return `ลูกหนี้-ค่าขนส่ง ${date}.xlsx`;
  }, [result]);

  async function chooseCsv() {
    setBusy("selecting");
    setError("");

    try {
      const selected =
        await receivablesFreightService.selectCsv();

      if (selected) {
        setCsvPath(selected);
        setResult(null);
        setSuccess("");
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy("");
    }
  }

  async function buildPreview() {
    if (!csvPath) {
      return;
    }

    setBusy("previewing");
    setError("");
    setSuccess("");

    try {
      const preview =
        await receivablesFreightService.preview({
          csvPath,
        });

      setResult(preview);
    } catch (requestError) {
      setResult(null);
      setError(getErrorMessage(requestError));
    } finally {
      setBusy("");
    }
  }

  async function exportWorkbook() {
    if (!canExport) {
      return;
    }

    setBusy("exporting");
    setError("");
    setSuccess("");

    try {
      const outputPath =
        await receivablesFreightService.selectOutputPath(
          suggestedName,
        );

      if (!outputPath) {
        return;
      }

      const processed =
        await receivablesFreightService.process({
          csvPath,
          outputPath,
        });

      setResult(processed);
      setSuccess(
        "สร้างไฟล์ลูกหนี้–ค่าขนส่งเรียบร้อยแล้ว",
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy("");
    }
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
            RECEIVABLES &amp; FREIGHT
          </p>

          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            ลงยอดลูกหนี้–ค่าขนส่ง
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            อ่านข้อมูล IV จาก CSV ตรวจสอบผลลัพธ์ และสร้าง Excel จาก Google Sheet Template
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300 bg-cyan-50 text-cyan-700">
          <FileSpreadsheet size={23} />
        </div>
      </header>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void chooseCsv()}
          className="group min-h-[126px] rounded-2xl border border-cyan-300 bg-white p-5 text-left shadow-[0_16px_35px_rgba(8,145,178,0.08)] transition hover:-translate-y-0.5 hover:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-300 bg-cyan-50 text-cyan-700">
              <Upload size={21} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-slate-900">
                อัปโหลดไฟล์ CSV
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                ระบบอ่าน IV จากคอลัมน์ G เริ่มต้นที่ G10
              </span>
              <span className="mt-3 block truncate text-sm font-medium text-cyan-700">
                {csvPath || "คลิกเพื่อเลือกไฟล์ CSV"}
              </span>
            </span>
          </div>
        </button>

        <div className="min-h-[126px] rounded-2xl border border-blue-200 bg-blue-50/70 p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-300 bg-white text-blue-700">
              <Sheet size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-semibold text-slate-900">
                Google Sheet Template
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-700">
                  LOCKED
                </span>
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                เขียนข้อมูลลงชีต “ลูกหนี้” เริ่มแถว 4 และคงสูตรคอลัมน์ G–L
              </span>
              <a
                href={receivablesTemplateUrl.replace("/export?format=xlsx", "/edit")}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
              >
                เปิดดู Template
                <ExternalLink size={14} />
              </a>
            </span>
          </div>
        </div>
      </section>

      {(error || success) && (
        <div
          className={`mt-5 rounded-xl border px-5 py-4 text-sm ${
            error
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-emerald-300 bg-emerald-50 text-emerald-700"
          }`}
        >
          <p className="font-semibold">
            {error || success}
          </p>
          {result?.output_path && !error && (
            <button
              type="button"
              onClick={() => void receivablesFreightService.openOutput(result.output_path)}
              className="mt-2 inline-flex items-center gap-1 break-all text-left text-xs underline"
            >
              <ExternalLink size={13} />
              {result.output_path}
            </button>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          disabled={!csvPath || Boolean(busy)}
          onClick={() => void buildPreview()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#063b59] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#075071] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "previewing" ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <ScanSearch size={18} />
          )}
          ประมวลผลและแสดง Preview
        </button>

        <button
          type="button"
          disabled={!canExport || Boolean(busy)}
          onClick={() => void exportWorkbook()}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "exporting" ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <FileDown size={18} />
          )}
          สร้างไฟล์ Excel
        </button>
      </div>

      {result && (
        <section className="mt-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.22em] text-cyan-700">
                PREVIEW
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">
                ตรวจสอบข้อมูลก่อนบันทึก
              </h3>
            </div>
            <p className="text-sm text-slate-600">
              {result.record_count.toLocaleString()} IV · {result.warehouses.length} คลัง
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="IV ทั้งหมด" value={result.record_count.toLocaleString()} />
            <Stat label="จำนวนลังรวม" value={formatNumber(result.total_quantity)} />
            <Stat label="Exc-vat รวม" value={formatMoney(result.total_exc_vat)} />
            <Stat
              label="ต้องตรวจสอบ"
              value={String(result.review_count + result.error_count)}
              warning={result.review_count + result.error_count > 0}
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="max-h-[590px] overflow-auto">
              <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[#eaf8fc] text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-3">วันที่</th>
                    <th className="px-4 py-3">เลข Invoice</th>
                    <th className="px-4 py-3">ลูกค้า</th>
                    <th className="px-4 py-3">จัดส่งปลายทาง</th>
                    <th className="px-4 py-3 text-right">จำนวนลัง</th>
                    <th className="px-4 py-3 text-right">Exc-vat</th>
                    <th className="px-4 py-3">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {result.records.map((record) => (
                    <tr
                      key={`${record.invoice}-${record.source_row}`}
                      className="border-t border-slate-100 text-slate-700 hover:bg-cyan-50/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3">{record.date}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-blue-700">{record.invoice}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{record.customer || "-"}</p>
                        <p className="mt-1 text-xs text-slate-400">{record.warehouse || "ไม่พบคลัง"}</p>
                      </td>
                      <td className="px-4 py-3">{record.destination || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatNumber(record.quantity)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(record.exc_vat)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(record.status)}`}>
                          <CheckCircle2 size={13} />
                          {record.status === "ready" ? "พร้อม" : record.message || "ตรวจสอบ"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-cyan-200 bg-white px-5 py-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${warning ? "text-amber-600" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}

function statusClass(status: string) {
  if (status === "ready") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "error") {
    return "bg-red-50 text-red-700";
  }
  return "bg-amber-50 text-amber-700";
}

function formatNumber(value: number) {
  return value.toLocaleString("th-TH", {
    maximumFractionDigits: 2,
  });
}

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error);
}
