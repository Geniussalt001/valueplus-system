import {
  Eye,
  FileUp,
  Inbox,
} from "lucide-react";

import { poStatusOptions } from "./poData.config";
import type {
  PoRecord,
  PoStatus,
} from "./poData.types";

interface PoDataTableProps {
  records: PoRecord[];
  onStatusChange: (
    id: string,
    status: PoStatus,
  ) => void;
  onPdfUpload: (id: string, file: File) => void;
  onPdfPreview: (record: PoRecord) => void;
}

export function PoDataTable({
  records,
  onStatusChange,
  onPdfUpload,
  onPdfPreview,
}: PoDataTableProps) {
  if (records.length === 0) {
    return (
      <section className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/15 bg-[#051322]/50">
        <Inbox size={34} className="text-slate-600" />

        <p className="mt-4 text-sm text-slate-400">
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
        <table className="w-full min-w-[1050px] border-collapse">
          <thead className="border-b border-white/[0.06] bg-white/[0.02]">
            <tr className="text-left text-[10px] tracking-[0.16em] text-slate-600">
              <th className="px-5 py-4">IV NUMBER</th>
              <th className="px-5 py-4">PO NUMBER</th>
              <th className="px-5 py-4">DATE</th>
              <th className="px-5 py-4">BRANCH</th>
              <th className="px-5 py-4">ASSIGNEE</th>
              <th className="px-5 py-4">STATUS</th>
              <th className="px-5 py-4">PDF DOCUMENT</th>
            </tr>
          </thead>

          <tbody>
            {records.map((record) => {
              const status = poStatusOptions.find(
                (option) =>
                  option.value === record.status,
              );

              return (
                <tr
                  key={record.id}
                  className="border-b border-white/[0.045] text-sm transition last:border-0 hover:bg-cyan-300/[0.025]"
                >
                  <td className="px-5 py-5 font-medium text-cyan-100">
                    {record.ivNumber}
                  </td>

                  <td className="px-5 py-5 font-mono text-slate-300">
                    {record.poNumber}
                  </td>

                  <td className="px-5 py-5 text-slate-400">
                    {record.documentDate}
                  </td>

                  <td className="px-5 py-5 text-slate-300">
                    {record.branch || "-"}
                  </td>

                  <td className="px-5 py-5 text-slate-400">
                    {record.assignee || "-"}
                  </td>

                  <td className="px-5 py-5">
                    <select
                      value={record.status}
                      onChange={(event) =>
                        onStatusChange(
                          record.id,
                          event.target.value as PoStatus,
                        )
                      }
                      className={`rounded-lg border px-3 py-2 text-xs outline-none ${status?.badgeClass}`}
                    >
                      {poStatusOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                          className="bg-[#061525] text-white"
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-5 py-5">
                    {record.pdfUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          onPdfPreview(record)
                        }
                        className="flex max-w-52 items-center gap-2 text-xs text-emerald-300 transition hover:text-emerald-200"
                      >
                        <Eye size={16} />

                        <span className="truncate">
                          {record.pdfName}
                        </span>
                      </button>
                    ) : (
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-300/15 bg-cyan-300/5 px-3 py-2 text-xs text-cyan-300 transition hover:bg-cyan-300/10">
                        <FileUp size={15} />
                        แนบ PDF

                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={(event) => {
                            const file =
                              event.target.files?.[0];

                            if (file) {
                              onPdfUpload(
                                record.id,
                                file,
                              );
                            }

                            event.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}