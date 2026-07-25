import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Folder,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";

import {
  receivablesArchiveService,
} from "../../../services/receivablesArchiveService";

import type {
  ReceivablesArchiveDetail,
  ReceivablesArchiveSummary,
} from "../../../types/receivablesArchive.types";

interface ReceivablesArchivePageProps {
  onBack: () => void;
}

const columns = [
  "วันที่",
  "เลข Invoice",
  "ชื่อลูกค้า",
  "จัดส่งปลายทาง",
  "จำนวนลัง",
  "Exc-vat",
  "Vat 7%",
  "Inc-Vat",
  "ติดการจ่าย (วัน)",
  "เลขที่ใบลดหนี้",
  "ยอดลดหนี้",
  "ยอดสุทธิ",
  "กำหนดจ่าย",
  "Status",
];

const editableColumns =
  new Set([
    1, 2, 3, 4, 5, 6,
    9, 10, 11, 13, 14,
  ]);

export function ReceivablesArchivePage({
  onBack,
}: ReceivablesArchivePageProps) {
  const [archives, setArchives] =
    useState<ReceivablesArchiveSummary[]>([]);
  const [selectedYear, setSelectedYear] =
    useState<number | null>(null);
  const [detail, setDetail] =
    useState<ReceivablesArchiveDetail | null>(null);
  const [folderQuery, setFolderQuery] =
    useState("");
  const [rowQuery, setRowQuery] =
    useState("");
  const [changes, setChanges] =
    useState<Record<string, string>>({});
  const [loading, setLoading] =
    useState(false);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  const loadArchives = async () => {
    setLoading(true);
    setError("");

    try {
      const result =
        await receivablesArchiveService.list();

      setArchives(result);

      if (result.length > 0) {
        setSelectedYear((current) =>
          current ??
          result[0].buddhistYear,
        );
      }
    } catch (requestError) {
      setError(
        getErrorMessage(requestError),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadArchives();
  }, []);

  const years = useMemo(() => {
    return Array.from(
      new Set(
        archives.map(
          (archive) =>
            archive.buddhistYear,
        ),
      ),
    ).sort((a, b) => b - a);
  }, [archives]);

  const visibleArchives =
    useMemo(() => {
      const query =
        folderQuery
          .trim()
          .toLocaleLowerCase("th");

      return archives.filter(
        (archive) => {
          if (
            selectedYear &&
            archive.buddhistYear !==
              selectedYear
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            archive.spreadsheetName,
            archive.monthName,
            String(
              archive.buddhistYear,
            ),
          ].some((value) =>
            value
              .toLocaleLowerCase("th")
              .includes(query),
          );
        },
      );
    }, [
      archives,
      folderQuery,
      selectedYear,
    ]);

  const visibleRows = useMemo(() => {
    if (!detail) {
      return [];
    }

    const query =
      rowQuery
        .trim()
        .toLocaleLowerCase("th");

    if (!query) {
      return detail.rows;
    }

    return detail.rows.filter(
      (row) =>
        row.values.some((value) =>
          String(value || "")
            .toLocaleLowerCase("th")
            .includes(query),
        ),
    );
  }, [detail, rowQuery]);

  const openArchive = async (
    archive:
      ReceivablesArchiveSummary,
  ) => {
    setLoading(true);
    setError("");
    setSuccess("");
    setChanges({});

    try {
      const result =
        await receivablesArchiveService.get(
          archive.spreadsheetId,
        );

      setDetail(result);
    } catch (requestError) {
      setError(
        getErrorMessage(requestError),
      );
    } finally {
      setLoading(false);
    }
  };

  const updateCell = (
    rowNumber: number,
    column: number,
    value: string,
  ) => {
    const key =
      `${rowNumber}-${column}`;

    setChanges((current) => ({
      ...current,
      [key]: value,
    }));
    setSuccess("");
  };

  const saveChanges = async () => {
    if (
      !detail ||
      Object.keys(changes).length === 0
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const requestChanges =
        Object.entries(changes).map(
          ([key, value]) => {
            const [row, column] =
              key.split("-").map(Number);

            return {
              rowNumber: row,
              column,
              value,
            };
          },
        );

      const result =
        await receivablesArchiveService.update(
          detail.spreadsheetId,
          requestChanges,
        );

      setDetail(result);
      setChanges({});
      setSuccess(
        `บันทึกข้อมูล ${requestChanges.length.toLocaleString("th-TH")} ช่องเรียบร้อยแล้ว`,
      );
    } catch (requestError) {
      setError(
        getErrorMessage(requestError),
      );
    } finally {
      setSaving(false);
    }
  };

  if (detail) {
    return (
      <div className="mx-auto max-w-[1680px] px-5 py-7 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <button
              type="button"
              onClick={() => {
                setDetail(null);
                setChanges({});
                setRowQuery("");
                setError("");
                setSuccess("");
              }}
              className="flex items-center gap-2 text-sm text-slate-500 transition hover:text-cyan-700"
            >
              <ArrowLeft size={17} />
              กลับหน้าแฟ้มปีและเดือน
            </button>

            <p className="mt-5 text-[10px] font-semibold tracking-[0.24em] text-cyan-700">
              RECEIVABLES WORKBOOK
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {detail.spreadsheetName}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              แก้ไขช่องข้อมูลได้โดยตรง ส่วนช่องสีเทาเป็นสูตรและระบบล็อกไว้
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void receivablesArchiveService.openGoogleSheet(
                  detail.spreadsheetUrl,
                );
              }}
              className="flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-3 text-sm font-medium text-cyan-800 shadow-sm transition hover:bg-cyan-50"
            >
              <ExternalLink size={17} />
              เปิด Google Sheet
            </button>

            <button
              type="button"
              onClick={() => {
                void receivablesArchiveService.exportExcel(
                  detail.exportUrl,
                );
              }}
              className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Download size={17} />
              Export Excel
            </button>

            <button
              type="button"
              disabled={
                saving ||
                Object.keys(changes)
                  .length === 0
              }
              onClick={() => {
                void saveChanges();
              }}
              className="flex items-center gap-2 rounded-xl bg-[#063b59] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#075071] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? (
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Save size={17} />
              )}
              บันทึกการแก้ไข
              {Object.keys(changes)
                .length > 0 &&
                ` (${Object.keys(changes).length})`}
            </button>
          </div>
        </div>

        <MessageBox
          error={error}
          success={success}
        />

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="รายการ Invoice"
            value={detail.recordCount.toLocaleString("th-TH")}
          />
          <SummaryCard
            label="จำนวนลังรวม"
            value={detail.totalQuantity.toLocaleString("th-TH")}
          />
          <SummaryCard
            label="Exc-vat รวม"
            value={detail.totalExcVat.toLocaleString("th-TH", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          />
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-3 border-b border-cyan-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-xl">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-700"
              />
              <input
                value={rowQuery}
                onChange={(event) =>
                  setRowQuery(
                    event.target.value,
                  )
                }
                placeholder="ค้นหา Invoice ลูกค้า ปลายทาง หรือสถานะ"
                className="w-full rounded-xl border border-cyan-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white"
              />
            </div>

            <p className="text-xs text-slate-500">
              แสดง {visibleRows.length.toLocaleString("th-TH")} แถว
            </p>
          </div>

          <div className="max-h-[640px] overflow-auto">
            <table className="min-w-[1900px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#e9f7fc] text-left text-xs text-slate-700 shadow-sm">
                <tr>
                  <th className="w-16 border-b border-cyan-200 px-3 py-3 text-center">
                    แถว
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="min-w-[150px] border-b border-cyan-200 px-3 py-3"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {visibleRows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className="border-b border-slate-100 last:border-0 hover:bg-cyan-50/40"
                  >
                    <td className="bg-slate-50 px-3 py-2 text-center font-mono text-xs text-slate-400">
                      {row.rowNumber}
                    </td>

                    {columns.map((_, index) => {
                      const column =
                        index + 1;
                      const key =
                        `${row.rowNumber}-${column}`;
                      const value =
                        changes[key] ??
                        row.values[index] ??
                        "";
                      const editable =
                        editableColumns.has(
                          column,
                        );

                      return (
                        <td
                          key={key}
                          className="px-2 py-2"
                        >
                          {editable ? (
                            <input
                              data-cell={key}
                              value={value}
                              onChange={(event) =>
                                updateCell(
                                  row.rowNumber,
                                  column,
                                  event.target.value,
                                )
                              }
                              onKeyDown={(event) => {
                                if (event.key !== "Enter") {
                                  return;
                                }

                                event.preventDefault();
                                const target =
                                  document.querySelector<HTMLInputElement>(
                                    `[data-cell="${row.rowNumber + 1}-${column}"]`,
                                  );
                                target?.focus();
                                target?.select();
                              }}
                              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition ${
                                changes[key] !== undefined
                                  ? "border-amber-400 bg-amber-50 text-slate-900"
                                  : "border-slate-200 bg-white text-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                              }`}
                            />
                          ) : (
                            <div className="min-h-10 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-500">
                              {value || "-"}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
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
            กลับหน้าศูนย์แฟ้มข้อมูล
          </button>

          <p className="text-[10px] font-semibold tracking-[0.24em] text-cyan-700">
            RECEIVABLES &amp; FREIGHT ARCHIVE
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            แฟ้มข้อมูลลูกหนี้–ค่าขนส่ง
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            ค้นหาแฟ้มตามปีและเดือน เปิดตารางแก้ไขข้อมูล และ Export เป็น Excel
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            void loadArchives();
          }}
          className="flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-3 text-sm font-medium text-cyan-800 shadow-sm transition hover:bg-cyan-50 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />
          โหลดข้อมูลใหม่
        </button>
      </header>

      <MessageBox
        error={error}
        success={success}
      />

      <section className="mt-7 rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            size={19}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-700"
          />
          <input
            value={folderQuery}
            onChange={(event) =>
              setFolderQuery(
                event.target.value,
              )
            }
            placeholder="ค้นหาเดือน ปี หรือชื่อแฟ้ม"
            className="w-full rounded-xl border border-cyan-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-cyan-500 focus:bg-white"
          />
        </div>
      </section>

      {loading && archives.length === 0 ? (
        <div className="mt-8 flex min-h-80 items-center justify-center rounded-3xl border border-cyan-200 bg-white">
          <LoaderCircle
            size={34}
            className="animate-spin text-cyan-600"
          />
        </div>
      ) : archives.length === 0 ? (
        <div className="mt-8 flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-cyan-300 bg-white text-center">
          <FolderOpen
            size={42}
            className="text-slate-300"
          />
          <p className="mt-4 font-semibold text-slate-700">
            ยังไม่พบแฟ้มลูกหนี้–ค่าขนส่ง
          </p>
          <p className="mt-2 text-sm text-slate-500">
            แฟ้มจะปรากฏหลังบันทึกข้อมูลรายเดือนครั้งแรก
          </p>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <div className="flex items-center gap-2">
              <Folder size={20} className="text-cyan-700" />
              <h3 className="text-lg font-semibold text-slate-900">
                แฟ้มปี
              </h3>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {years.map((year) => {
                const count =
                  archives.filter(
                    (archive) =>
                      archive.buddhistYear ===
                      year,
                  ).length;

                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() =>
                      setSelectedYear(year)
                    }
                    className={`min-w-44 rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 ${
                      selectedYear === year
                        ? "border-cyan-500 bg-[#063b59] text-white shadow-cyan-900/20"
                        : "border-cyan-200 bg-white text-slate-800 hover:bg-cyan-50"
                    }`}
                  >
                    <Folder size={25} />
                    <p className="mt-4 text-xl font-semibold">
                      ปี {year}
                    </p>
                    <p className={`mt-1 text-xs ${
                      selectedYear === year
                        ? "text-cyan-100"
                        : "text-slate-500"
                    }`}>
                      {count} แฟ้มเดือน
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-8">
            <div className="flex items-center gap-2">
              <CalendarDays size={20} className="text-amber-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                แฟ้มเดือน ปี {selectedYear}
              </h3>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleArchives.map(
                (archive) => (
                  <button
                    key={archive.spreadsheetId}
                    type="button"
                    onClick={() => {
                      void openArchive(archive);
                    }}
                    className="group rounded-2xl border border-amber-200 bg-gradient-to-br from-white to-amber-50/50 p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-600">
                        <FileSpreadsheet size={23} />
                      </span>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700">
                        พร้อมใช้งาน
                      </span>
                    </div>

                    <p className="mt-5 text-xl font-semibold text-slate-900">
                      {archive.monthName}
                    </p>
                    <p className="mt-1 text-sm font-medium text-cyan-700">
                      พ.ศ. {archive.buddhistYear}
                    </p>
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
                      {archive.spreadsheetName}
                    </p>
                    <p className="mt-5 text-[11px] text-slate-400">
                      แก้ไขล่าสุด {formatDateTime(archive.modifiedAt)}
                    </p>
                  </button>
                ),
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function MessageBox({
  error,
  success,
}: {
  error: string;
  success: string;
}) {
  if (!error && !success) {
    return null;
  }

  return (
    <div className={`mt-5 rounded-xl border px-5 py-4 text-sm ${
      error
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700"
    }`}>
      {error || success}
    </div>
  );
}

function formatDateTime(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
