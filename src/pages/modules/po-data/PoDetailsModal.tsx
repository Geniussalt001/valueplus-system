import {
  CalendarDays,
  Clock3,
  FileText,
  History,
  LoaderCircle,
  UserRound,
  X,
} from "lucide-react";

import type {
  PoHistoryRecord,
  PoRecord,
} from "./poData.types";

interface PoDetailsModalProps {
  record: PoRecord;
  history: PoHistoryRecord[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onPreviewPdf: (
    record: PoRecord,
  ) => void;
}

export function PoDetailsModal({
  record,
  history,
  loading,
  error,
  onClose,
  onPreviewPdf,
}: PoDetailsModalProps) {
  const hasPdf = Boolean(
    record.pdfFileId ||
      record.pdfUrl,
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#061525] shadow-[0_35px_110px_rgba(0,0,0,0.7)]">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-cyan-300">
              PO DETAILS & HISTORY
            </p>

            <h3 className="mt-1 text-xl font-semibold text-white">
              {record.poNumber}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-500 transition hover:border-red-300/30 hover:text-red-300"
          >
            <X size={20} />
          </button>
        </header>

        <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_0.9fr]">
          <section className="border-b border-white/[0.06] p-6 lg:border-b-0 lg:border-r">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailBox
                label="PO Number"
                value={record.poNumber}
              />

              <DetailBox
                label="IV Number"
                value={record.ivNumber}
              />

              <DetailBox
                label="Date"
                value={formatDate(
                  record.documentDate,
                )}
              />

              <DetailBox
                label="Reference"
                value={
                  record.reference ||
                  "-"
                }
              />

              <DetailBox
                label="Customer name"
                value={
                  record.customerName ||
                  "-"
                }
              />

              <DetailBox
                label="Assignee"
                value={
                  record.assignee ||
                  "-"
                }
              />

              <DetailBox
                label="Status"
                value={getStatusLabel(
                  record.status,
                )}
              />

              <DetailBox
                label="Created by"
                value={
                  record.createdBy ||
                  "-"
                }
              />
            </div>

            <div className="mt-5 rounded-xl border border-white/[0.06] bg-[#020b16]/65 p-4">
              <p className="text-[10px] tracking-[0.16em] text-slate-600">
                PDF DOCUMENT
              </p>

              {hasPdf ? (
                <button
                  type="button"
                  onClick={() =>
                    onPreviewPdf(record)
                  }
                  className="mt-3 flex w-full items-center gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4 text-left transition hover:bg-emerald-300/10"
                >
                  <FileText
                    size={21}
                    className="shrink-0 text-emerald-300"
                  />

                  <div className="min-w-0">
                    <p className="truncate text-sm text-emerald-200">
                      {record.pdfName ||
                        "PDF Document"}
                    </p>

                    <p className="mt-1 text-[10px] text-emerald-300/60">
                      กดเพื่อเปิด Preview
                    </p>
                  </div>
                </button>
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  ยังไม่มีเอกสาร PDF
                </p>
              )}
            </div>

            {record.note && (
              <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] p-4">
                <p className="text-[10px] tracking-[0.16em] text-amber-300">
                  NOTE
                </p>

                <p className="mt-2 text-sm leading-6 text-amber-100/80">
                  {record.note}
                </p>
              </div>
            )}
          </section>

          <section className="p-6">
            <div className="flex items-center gap-3">
              <History
                size={19}
                className="text-cyan-300"
              />

              <div>
                <p className="text-sm font-medium text-white">
                  ประวัติการทำงาน
                </p>

                <p className="mt-1 text-[10px] tracking-[0.14em] text-slate-600">
                  ACTIVITY TIMELINE
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-64 flex-col items-center justify-center">
                <LoaderCircle
                  size={28}
                  className="animate-spin text-cyan-300"
                />

                <p className="mt-4 text-xs text-slate-500">
                  กำลังโหลดประวัติ...
                </p>
              </div>
            ) : error ? (
              <div className="mt-6 rounded-xl border border-red-300/20 bg-red-300/[0.07] p-4 text-xs leading-6 text-red-200">
                {error}
              </div>
            ) : history.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center">
                <Clock3
                  size={28}
                  className="text-slate-700"
                />

                <p className="mt-4 text-xs text-slate-600">
                  ยังไม่มีประวัติ
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-0">
                {history.map(
                  (
                    activity,
                    index,
                  ) => (
                    <TimelineItem
                      key={
                        activity.id
                      }
                      activity={
                        activity
                      }
                      last={
                        index ===
                        history.length -
                          1
                      }
                    />
                  ),
                )}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function DetailBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#020b16]/55 p-4">
      <p className="text-[10px] tracking-[0.14em] text-slate-600">
        {label}
      </p>

      <p className="mt-2 break-words text-sm text-slate-200">
        {value}
      </p>
    </div>
  );
}

function TimelineItem({
  activity,
  last,
}: {
  activity: PoHistoryRecord;
  last: boolean;
}) {
  const action =
    getActionInformation(
      activity.action,
    );

  return (
    <div className="relative flex gap-4 pb-6">
      {!last && (
        <div className="absolute left-[7px] top-5 h-full w-px bg-cyan-300/10" />
      )}

      <span
        className={`relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ${action.dotClass}`}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p
            className={`text-sm font-medium ${action.textClass}`}
          >
            {action.label}
          </p>

          <p className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <CalendarDays
              size={11}
            />

            {formatDateTime(
              activity.createdAt,
            )}
          </p>
        </div>

        <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <UserRound size={12} />
          {activity.userCode ||
            "SYSTEM"}
        </p>

        {activity.note && (
          <p className="mt-2 rounded-lg bg-white/[0.025] px-3 py-2 text-xs leading-5 text-slate-400">
            {activity.note}
          </p>
        )}

        {activity.newStatus && (
          <p className="mt-2 text-[10px] text-slate-600">
            สถานะ:{" "}
            {getStatusLabel(
              activity.newStatus,
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function getActionInformation(
  action: string,
) {
  switch (action) {
    case "CREATE":
      return {
        label: "สร้างรายการ",
        textClass:
          "text-cyan-300",
        dotClass:
          "bg-cyan-300 shadow-[0_0_9px_#67e8f9]",
      };

    case "UPDATE_DETAILS":
      return {
        label:
          "แก้ไขรายละเอียด",
        textClass:
          "text-blue-300",
        dotClass:
          "bg-blue-300 shadow-[0_0_9px_#93c5fd]",
      };

    case "UPDATE_STATUS":
      return {
        label:
          "เปลี่ยนสถานะ",
        textClass:
          "text-amber-300",
        dotClass:
          "bg-amber-300 shadow-[0_0_9px_#fcd34d]",
      };

    case "UPLOAD_PDF":
      return {
        label:
          "อัปโหลด PDF",
        textClass:
          "text-emerald-300",
        dotClass:
          "bg-emerald-300 shadow-[0_0_9px_#6ee7b7]",
      };

    case "DELETE":
      return {
        label: "ลบรายการ",
        textClass:
          "text-red-300",
        dotClass:
          "bg-red-300 shadow-[0_0_9px_#fca5a5]",
      };

    default:
      return {
        label:
          action ||
          "ดำเนินการ",
        textClass:
          "text-slate-300",
        dotClass:
          "bg-slate-400",
      };
  }
}

function getStatusLabel(
  status: string,
) {
  switch (status) {
    case "waiting":
      return "รอเอกสาร";

    case "reviewing":
      return "กำลังตรวจสอบ";

    case "complete":
      return "สมบูรณ์";

    case "issue":
      return "พบปัญหา";

    case "deleted":
      return "ลบแล้ว";

    default:
      return status || "-";
  }
}

function formatDate(
  value: string,
) {
  if (!value) return "-";

  const parts =
    value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateTime(
  value: string,
) {
  if (!value) return "-";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "th-TH",
    {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone:
        "Asia/Bangkok",
    },
  ).format(date);
}