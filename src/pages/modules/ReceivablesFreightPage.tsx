import {
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  LoaderCircle,
  ReceiptText,
  ScanSearch,
  Sheet,
  Upload,
} from "lucide-react";

import {
  receivablesFreightService,
  receivablesTemplateUrl,
} from "../../services/receivablesFreightService";

import {
  ProcessStatusOverlay,
} from "../../components/common/ProcessStatusOverlay";

import {
  isAppsScriptQueuedError,
} from "../../services/appsScriptClient";

import type {
  CreditNoteResult,
  ReceivablesFreightResult,
  ReceivablesMonthlySheetResult,
} from "../../types/receivablesFreight.types";

interface ReceivablesFreightPageProps {
  onBack: () => void;
}

type ReceivablesMode =
  | "receivables"
  | "credit-notes";

export function ReceivablesFreightPage({
  onBack,
}: ReceivablesFreightPageProps) {
  const [mode, setMode] =
    useState<ReceivablesMode>(
      "receivables",
    );
  const [csvPath, setCsvPath] =
    useState("");
  const [result, setResult] =
    useState<
      | ReceivablesFreightResult
      | CreditNoteResult
      | null
    >(null);
  const [monthlySheet, setMonthlySheet] =
    useState<ReceivablesMonthlySheetResult | null>(null);
  const [busy, setBusy] =
    useState<"" | "selecting" | "previewing" | "saving">("");
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

  const isCreditNoteMode =
    mode === "credit-notes";

  function switchMode(
    nextMode: ReceivablesMode,
  ) {
    if (
      nextMode === mode ||
      busy
    ) {
      return;
    }

    setMode(nextMode);
    setCsvPath("");
    setResult(null);
    setMonthlySheet(null);
    setError("");
    setSuccess("");
  }

  async function chooseCsv() {
    setBusy("selecting");
    setError("");

    try {
      const selected =
        await receivablesFreightService.selectCsv();

      if (selected) {
        setCsvPath(selected);
        setResult(null);
        setMonthlySheet(null);
        setSuccess("");
      }
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
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
        isCreditNoteMode
          ? await receivablesFreightService
              .previewCreditNotes(
                csvPath,
              )
          : await receivablesFreightService
              .preview({
                csvPath,
                mode:
                  "receivables",
              });

      setResult(preview);
    } catch (requestError) {
      setResult(null);
      setError(getErrorMessage(requestError));
    } finally {
      setBusy("");
    }
  }

  async function saveMonthlySheet() {
    if (!canExport || !result) {
      return;
    }

    setBusy("saving");
    setError("");
    setSuccess("");

    try {
      const saved =
        isCreditNoteResult(
          result,
        )
          ? await receivablesFreightService
              .saveCreditNotes(
                result.records,
              )
          : await receivablesFreightService
              .saveMonthlySheet(
                result.records,
              );

      setMonthlySheet(saved);

      const duplicateNote =
        saved.duplicateCount > 0
          ? ` · พบ${
              isCreditNoteMode
                ? "ใบลดหนี้"
                : " IV"
            }เดิม ${saved.duplicateCount.toLocaleString()} รายการ (ไม่บันทึกซ้ำ)`
          : "";

      setSuccess(
        `${saved.created ? "สร้าง" : "อัปเดต"} ${saved.spreadsheetName} เรียบร้อย · เพิ่ม ${saved.insertedCount.toLocaleString()} ${
          isCreditNoteMode
            ? "ใบลดหนี้"
            : "IV"
        }${
          isCreditNoteMode
            ? ""
            : ` · เว้น IV ที่ยังไม่มี ${saved.missingCount.toLocaleString()} ตำแหน่ง`
        }${duplicateNote}`,
      );
    } catch (requestError) {
      if (
        isAppsScriptQueuedError(
          requestError,
        )
      ) {
        setSuccess(
          "รับข้อมูลไว้ในเครื่องแล้ว ระบบจะบันทึกลง Google Sheet อัตโนมัติเมื่อเชื่อมต่อได้",
        );
      } else {
        setError(
          getErrorMessage(
            requestError,
          ),
        );
      }
    } finally {
      setBusy("");
    }
  }

  function updateAppliedInvoice(
    sourceRow: number,
    value: string,
  ) {
    setResult((currentResult) => {
      if (
        !currentResult ||
        !isCreditNoteResult(
          currentResult,
        )
      ) {
        return currentResult;
      }

      return {
        ...currentResult,
        records:
          currentResult.records.map(
            (record) =>
              record.source_row ===
              sourceRow
                ? {
                    ...record,
                    applied_invoice:
                      normalizeManualInvoice(
                        value,
                      ),
                  }
                : record,
          ),
      };
    });

    setMonthlySheet(null);
    setSuccess("");
  }

  return (
    <div className="vp-work-page receivables-freight-workspace mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
      <ProcessStatusOverlay
        open={Boolean(busy)}
        title={
          busy === "selecting"
            ? "กำลังเปิดหน้าต่างเลือกไฟล์ CSV..."
            : busy === "previewing"
              ? "กำลังอ่านและตรวจสอบข้อมูล CSV..."
              : "กำลังบันทึกข้อมูลลง Google Sheets..."
        }
      />
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
            RECEIVABLES &amp; FREIGHT
          </p>

          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            {isCreditNoteMode
              ? "ลงข้อมูลลดหนี้"
              : "ลงยอดลูกหนี้–ค่าขนส่ง"}
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            {isCreditNoteMode
              ? "อ่านใบลดหนี้จาก CSV ตรวจสอบการอ้างอิง IV และบันทึกลงชีต “ลดหนี้” ในแฟ้มรายเดือน"
              : "อ่านข้อมูล IV จาก CSV ตรวจสอบผลลัพธ์ และสะสมข้อมูลลง Google Sheet รายเดือน"}
          </p>
        </div>

        <div className="vp-page-icon flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300 bg-cyan-50 text-cyan-700">
          <FileSpreadsheet size={23} />
        </div>
      </header>

      <section className="mt-6 rounded-2xl border border-cyan-200 bg-white p-2 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <ModeButton
            active={!isCreditNoteMode}
            tone="receivables"
            title="ลูกหนี้"
            description="นำเข้ายอดลูกหนี้และค่าขนส่งตามระบบเดิม"
            icon={
              <FileSpreadsheet
                size={18}
              />
            }
            onClick={() => {
              switchMode(
                "receivables",
              );
            }}
          />

          <ModeButton
            active={isCreditNoteMode}
            tone="credit-notes"
            title="ลดหนี้"
            description="อ่านใบลดหนี้และ IV อ้างอิงจาก CSV"
            icon={
              <ReceiptText
                size={18}
              />
            }
            onClick={() => {
              switchMode(
                "credit-notes",
              );
            }}
          />
        </div>
      </section>

      <section className="vp-setup-grid mt-8 grid gap-4 lg:grid-cols-2">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void chooseCsv()}
          className="vp-setup-card vp-upload-card group min-h-[126px] rounded-2xl border border-cyan-300 bg-white p-5 text-left shadow-[0_16px_35px_rgba(8,145,178,0.08)] transition hover:-translate-y-0.5 hover:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                {isCreditNoteMode
                  ? "อ่านเลข SR จาก F, วันที่ G, IV จาก I/O และยอดจาก N"
                  : "ระบบอ่าน IV จากคอลัมน์ G เริ่มต้นที่ G10"}
              </span>
              <span className="mt-3 block truncate text-sm font-medium text-cyan-700">
                {csvPath || "คลิกเพื่อเลือกไฟล์ CSV"}
              </span>
            </span>
          </div>
        </button>

        <div className="vp-setup-card min-h-[126px] rounded-2xl border border-blue-200 bg-blue-50/70 p-5">
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
                {isCreditNoteMode
                  ? "เขียนข้อมูลลงชีต “ลดหนี้” คอลัมน์ A–F เริ่มแถว 3"
                  : "เขียนข้อมูลลงชีต “ลูกหนี้” เริ่มแถว 4 และคงสูตรคอลัมน์ G–L"}
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
          {monthlySheet && !error && (
            <a
              href={monthlySheet.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 break-all text-left text-xs underline"
            >
              <ExternalLink size={13} />
              เปิด {monthlySheet.spreadsheetName}
            </a>
          )}
        </div>
      )}

      <div className="vp-action-bar mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          disabled={!csvPath || Boolean(busy)}
          onClick={() => void buildPreview()}
          className="vp-action-button vp-action-primary inline-flex items-center gap-2 rounded-xl bg-[#063b59] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#075071] disabled:cursor-not-allowed disabled:opacity-40"
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
          onClick={() => void saveMonthlySheet()}
          className="vp-action-button vp-action-success inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "saving" ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <FileDown size={18} />
          )}
          {isCreditNoteMode
            ? "บันทึกลงชีต ลดหนี้"
            : "บันทึก Google Sheet รายเดือน"}
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
              {isCreditNoteResult(result)
                ? `${result.record_count.toLocaleString()} ใบลดหนี้`
                : `${result.record_count.toLocaleString()} IV · ${result.warehouses.length} คลัง`}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {isCreditNoteResult(result) ? (
              <>
                <Stat
                  label="ใบลดหนี้ทั้งหมด"
                  value={result.record_count.toLocaleString()}
                />
                <Stat
                  label="ยอดลดหนี้รวม"
                  value={formatMoney(result.total_amount)}
                />
                <Stat
                  label="มี Inv. ที่ใช้ลดหนี้"
                  value={result.records
                    .filter((record) => Boolean(record.applied_invoice))
                    .length.toLocaleString()}
                />
                <Stat
                  label="ต้องตรวจสอบ"
                  value={String(result.review_count + result.error_count)}
                  warning={result.review_count + result.error_count > 0}
                />
              </>
            ) : (
              <>
                <Stat label="IV ทั้งหมด" value={result.record_count.toLocaleString()} />
                <Stat label="จำนวนลังรวม" value={formatNumber(result.total_quantity)} />
                <Stat label="Exc-vat รวม" value={formatMoney(result.total_exc_vat)} />
                <Stat
                  label="ต้องตรวจสอบ"
                  value={String(result.review_count + result.error_count)}
                  warning={result.review_count + result.error_count > 0}
                />
              </>
            )}
          </div>

          <div className="vp-data-card mt-5 overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="max-h-[590px] overflow-auto">
              {isCreditNoteResult(result) ? (
                <CreditNoteTable
                  result={result}
                  onAppliedInvoiceChange={updateAppliedInvoice}
                />
              ) : (
                <ReceivablesTable result={result} />
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ModeButton({
  active,
  tone,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  tone: "receivables" | "credit-notes";
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  const isReceivables =
    tone === "receivables";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-[88px] items-center gap-4 overflow-hidden rounded-xl border px-5 py-4 text-left transition ${
        active
          ? isReceivables
            ? "border-cyan-400 bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-950 shadow-[0_10px_28px_rgba(8,145,178,0.13)]"
            : "border-violet-400 bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-950 shadow-[0_10px_28px_rgba(124,58,237,0.13)]"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          active
            ? isReceivables
              ? "bg-cyan-600 text-white shadow-md shadow-cyan-200"
              : "bg-violet-600 text-white shadow-md shadow-violet-200"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block text-xs opacity-75">{description}</span>
      </span>
      {active ? (
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
          isReceivables
            ? "bg-cyan-100 text-cyan-800"
            : "bg-violet-100 text-violet-800"
        }`}>
          กำลังใช้งาน
        </span>
      ) : null}
    </button>
  );
}

function CreditNoteTable({
  result,
  onAppliedInvoiceChange,
}: {
  result: CreditNoteResult;
  onAppliedInvoiceChange: (
    sourceRow: number,
    value: string,
  ) => void;
}) {
  return (
    <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
      <thead className="sticky top-0 z-10 bg-violet-50 text-xs text-slate-600">
        <tr>
          <th className="px-4 py-3">วันที่</th>
          <th className="px-4 py-3">ใบลดหนี้</th>
          <th className="px-4 py-3">ชื่อลูกค้า</th>
          <th className="px-4 py-3 text-right">ยอดลดหนี้</th>
          <th className="px-4 py-3">Inv. อ้างอิง</th>
          <th className="px-4 py-3">Inv. ที่ใช้ลดหนี้</th>
          <th className="px-4 py-3">สถานะ</th>
        </tr>
      </thead>
      <tbody>
        {result.records.map((record) => (
          <tr
            key={`${record.credit_note_number}-${record.source_row}`}
            className="border-t border-slate-100 text-slate-700 hover:bg-violet-50/50"
          >
            <td className="whitespace-nowrap px-4 py-3">{record.date}</td>
            <td className="whitespace-nowrap px-4 py-3 font-semibold text-violet-700">
              {record.credit_note_number}
            </td>
            <td className="px-4 py-3 font-medium text-slate-900">
              {record.customer || "-"}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-rose-700">
              {formatMoney(record.amount)}
            </td>
            <td className="whitespace-nowrap px-4 py-3">{record.reference_invoice || "-"}</td>
            <td className="min-w-[190px] px-4 py-3">
              <input
                type="text"
                value={record.applied_invoice}
                onChange={(event) => {
                  onAppliedInvoiceChange(
                    record.source_row,
                    event.target.value,
                  );
                }}
                placeholder="คีย์เลข VPR ด้วยตนเอง"
                aria-label={`Inv. ที่ใช้ลดหนี้ ${record.credit_note_number}`}
                className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 font-medium uppercase text-blue-700 outline-none transition placeholder:font-normal placeholder:normal-case placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={record.status} message={record.message} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReceivablesTable({
  result,
}: {
  result: ReceivablesFreightResult;
}) {
  return (
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
              <StatusBadge status={record.status} message={record.message} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusBadge({
  status,
  message,
}: {
  status: string;
  message: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(status)}`}>
      <CheckCircle2 size={13} />
      {status === "ready" ? "พร้อม" : message || "ตรวจสอบ"}
    </span>
  );
}

function isCreditNoteResult(
  result:
    | ReceivablesFreightResult
    | CreditNoteResult,
): result is CreditNoteResult {
  return (
    "mode" in result &&
    result.mode === "credit-notes"
  );
}

function normalizeManualInvoice(
  value: string,
) {
  return value
    .trimStart()
    .toUpperCase()
    .replace(/^IV(?=VPR)/, "")
    .replace(/\s+/g, "");
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
    <div className="vp-summary-card rounded-xl border border-cyan-200 bg-white px-5 py-4">
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
