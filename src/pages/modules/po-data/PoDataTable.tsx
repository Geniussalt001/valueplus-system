import {
  Eye,
  FileUp,
  History,
  Inbox,
  LoaderCircle,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  poStatusOptions,
} from "./poData.config";

import type {
  PoRecord,
  PoStatus,
} from "./poData.types";

interface PoDataTableProps {
  isAdmin: boolean;
  records: PoRecord[];

  uploadingId?: string;
  previewingId?: string;
  updatingStatusId?: string;
  deletingId?: string;

  onStatusChange: (
    id: string,
    status: PoStatus,
  ) => void;

  onPdfUpload: (
    id: string,
    file: File,
  ) => void;

  onPdfPreview: (
    record: PoRecord,
  ) => void;

  onViewDetails: (
    record: PoRecord,
  ) => void;

  onEdit: (
    record: PoRecord,
  ) => void;

  onDelete: (
    record: PoRecord,
  ) => void;
}

export function PoDataTable({
  isAdmin,
  records,
  uploadingId = "",
  previewingId = "",
  updatingStatusId = "",
  deletingId = "",
  onStatusChange,
  onPdfUpload,
  onPdfPreview,
  onViewDetails,
  onEdit,
  onDelete,
}: PoDataTableProps) {
  if (records.length === 0) {
    return (
      <section className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/15 bg-[#051322]/50">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-900/50">
          <Inbox
            size={30}
            className="text-slate-600"
          />
        </div>

        <p className="mt-5 text-sm text-slate-400">
          ไม่พบรายการ PO
        </p>

        <p className="mt-2 text-xs text-slate-600">
          ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ
        </p>
      </section>
    );
  }

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-cyan-300/10 bg-[#051322]/70 shadow-[0_20px_55px_rgba(0,0,0,0.2)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1600px] border-collapse">
          <thead className="border-b border-white/[0.06] bg-white/[0.02]">
            <tr className="text-left text-[10px] tracking-[0.14em] text-slate-600">
              <th className="px-5 py-4">
                PO NUMBER
              </th>

              <th className="px-5 py-4">
                IV NUMBER
              </th>

              <th className="px-5 py-4">
                DATE
              </th>

              <th className="px-5 py-4">
                REFERENCE
              </th>

              <th className="px-5 py-4">
                CUSTOMER NAME
              </th>

              <th className="px-5 py-4">
                ASSIGNEE
              </th>

              <th className="px-5 py-4">
                STATUS
              </th>

              <th className="px-5 py-4">
                PDF DOCUMENT
              </th>

              <th className="px-5 py-4 text-center">
                ACTIONS
              </th>
            </tr>
          </thead>

          <tbody>
            {records.map(
              (record) => {
                const status =
                  poStatusOptions.find(
                    (option) =>
                      option.value ===
                      record.status,
                  );

                const isUploading =
                  uploadingId ===
                  record.id;

                const isPreviewing =
                  previewingId ===
                  record.id;

                const isUpdatingStatus =
                  updatingStatusId ===
                  record.id;

                const isDeleting =
                  deletingId ===
                  record.id;

                const hasPdf =
                  Boolean(
                    record.pdfFileId ||
                      record.pdfUrl,
                  );

                return (
                  <tr
                    key={record.id}
                    className="border-b border-white/[0.045] text-sm transition last:border-0 hover:bg-cyan-300/[0.025]"
                  >
                    <td className="px-5 py-5">
                      <p className="font-mono font-medium text-cyan-100">
                        {record.poNumber}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-700">
                        {record.id}
                      </p>
                    </td>

                    <td className="px-5 py-5 font-mono text-slate-300">
                      {record.ivNumber}
                    </td>

                    <td className="px-5 py-5 text-slate-400">
                      {formatDocumentDate(
                        record.documentDate,
                      )}
                    </td>

                    <td className="max-w-52 px-5 py-5 text-slate-400">
                      <p className="truncate">
                        {record.reference ||
                          "-"}
                      </p>
                    </td>

                    <td className="max-w-56 px-5 py-5 text-slate-300">
                      <p className="truncate">
                        {record.customerName ||
                          "-"}
                      </p>
                    </td>

                    <td className="px-5 py-5 text-slate-400">
                      {record.assignee ||
                        "-"}
                    </td>

                    <td className="px-5 py-5">
                      {isAdmin ? (
                        <div className="relative inline-flex items-center">
                          {isUpdatingStatus ? (
                            <LoaderCircle
                              size={14}
                              className="absolute left-3 z-10 animate-spin text-cyan-300"
                            />
                          ) : (
                            <span
                              className={`absolute left-3 z-10 h-2 w-2 animate-pulse rounded-full ${
                                status?.dotClass ??
                                "bg-slate-500"
                              }`}
                            />
                          )}

                          <select
                            value={
                              record.status
                            }
                            disabled={
                              isUpdatingStatus ||
                              isDeleting
                            }
                            onChange={(
                              event,
                            ) =>
                              onStatusChange(
                                record.id,
                                event.target
                                  .value as PoStatus,
                              )
                            }
                            className={`min-w-40 rounded-lg border py-2 pl-8 pr-8 text-xs outline-none transition disabled:cursor-wait disabled:opacity-60 ${
                              status?.badgeClass ??
                              "border-slate-700 bg-slate-900 text-slate-300"
                            }`}
                          >
                            {poStatusOptions.map(
                              (option) => (
                                <option
                                  key={
                                    option.value
                                  }
                                  value={
                                    option.value
                                  }
                                  className="bg-[#061525] text-white"
                                >
                                  {
                                    option.label
                                  }
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      ) : (
                        <div
                          className={`inline-flex min-w-40 items-center gap-3 rounded-lg border px-3 py-2 text-xs ${
                            status?.badgeClass ??
                            "border-slate-700 bg-slate-900 text-slate-300"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 animate-pulse rounded-full ${
                              status?.dotClass ??
                              "bg-slate-500"
                            }`}
                          />

                          {status?.label ??
                            record.status}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-5">
                      {hasPdf ? (
                        <button
                          type="button"
                          disabled={
                            isPreviewing ||
                            isDeleting
                          }
                          onClick={() =>
                            onPdfPreview(
                              record,
                            )
                          }
                          className="flex max-w-56 items-center gap-2 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2 text-xs text-emerald-300 transition hover:bg-emerald-300/10 disabled:cursor-wait disabled:opacity-50"
                        >
                          {isPreviewing ? (
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Eye
                              size={16}
                            />
                          )}

                          <span className="truncate">
                            {isPreviewing
                              ? "กำลังเปิด PDF..."
                              : record.pdfName ||
                                "เปิด PDF"}
                          </span>
                        </button>
                      ) : (
                        <label
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                            isUploading
                              ? "cursor-wait border-amber-300/20 bg-amber-300/10 text-amber-300"
                              : "cursor-pointer border-cyan-300/15 bg-cyan-300/[0.05] text-cyan-300 hover:bg-cyan-300/10"
                          }`}
                        >
                          {isUploading ? (
                            <LoaderCircle
                              size={15}
                              className="animate-spin"
                            />
                          ) : (
                            <FileUp
                              size={15}
                            />
                          )}

                          {isUploading
                            ? "กำลังอัปโหลด..."
                            : "แนบ PDF"}

                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            disabled={
                              isUploading ||
                              isDeleting
                            }
                            className="hidden"
                            onChange={(
                              event,
                            ) => {
                              const file =
                                event.target
                                  .files?.[0];

                              if (file) {
                                onPdfUpload(
                                  record.id,
                                  file,
                                );
                              }

                              event.target.value =
                                "";
                            }}
                          />
                        </label>
                      )}
                    </td>

                    <td className="px-5 py-5">
                      <div className="vp-icon-button-group flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            onViewDetails(
                              record,
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-300/15 bg-violet-300/[0.05] text-violet-300 transition hover:bg-violet-300/10"
                          aria-label="รายละเอียดและประวัติ"
                          title="รายละเอียดและประวัติ"
                        >
                          <History
                            size={15}
                          />
                        </button>

                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              disabled={
                                isDeleting
                              }
                              onClick={() =>
                                onEdit(
                                  record,
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] text-cyan-300 transition hover:bg-cyan-300/10 disabled:opacity-40"
                              aria-label="แก้ไขรายการ"
                              title="แก้ไขรายการ"
                            >
                              <Pencil
                                size={15}
                              />
                            </button>

                            <button
                              type="button"
                              disabled={
                                isDeleting
                              }
                              onClick={() =>
                                onDelete(
                                  record,
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-300/15 bg-red-300/[0.05] text-red-300 transition hover:bg-red-300/10 disabled:cursor-wait disabled:opacity-50"
                              aria-label="ลบรายการ"
                              title="ลบรายการ"
                            >
                              {isDeleting ? (
                                <LoaderCircle
                                  size={15}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={15}
                                />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex items-center justify-between border-t border-white/[0.05] px-5 py-4 text-[11px] text-slate-600">
        <span>
          แสดงทั้งหมด{" "}
          {records.length} รายการ
        </span>

        <span>
          VALUEPLUS PO DATA
        </span>
      </footer>
    </section>
  );
}

function formatDocumentDate(
  dateValue: string,
) {
  if (!dateValue) {
    return "-";
  }

  const parts =
    dateValue.split("-");

  if (parts.length !== 3) {
    return dateValue;
  }

  const [year, month, day] =
    parts;

  return `${day}/${month}/${year}`;
}
