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
  LoaderCircle,
  RefreshCw,
  Save,
  Search,
  Sheet,
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

export function ReceivablesArchivePage({
  onBack,
}: ReceivablesArchivePageProps) {
  const [
    archives,
    setArchives,
  ] = useState<
    ReceivablesArchiveSummary[]
  >([]);

  const [
    selectedYear,
    setSelectedYear,
  ] = useState<number | null>(
    null,
  );

  const [
    detail,
    setDetail,
  ] = useState<
    ReceivablesArchiveDetail | null
  >(null);

  const [
    folderQuery,
    setFolderQuery,
  ] = useState("");

  const [
    rowQuery,
    setRowQuery,
  ] = useState("");

  const [
    changes,
    setChanges,
  ] = useState<
    Record<string, string>
  >({});

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadingProgress,
    setLoadingProgress,
  ] = useState(0);

  const [
    loadingLabel,
    setLoadingLabel,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  useEffect(() => {
    if (!loading) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setLoadingProgress(
          (current) => {
            if (current >= 92) {
              return current;
            }

            const step =
              current < 35
                ? 8
                : current < 70
                  ? 4
                  : 2;

            return Math.min(
              92,
              current + step,
            );
          },
        );
      }, 180);

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [loading]);

  const beginLoading = (
    label: string,
  ) => {
    setLoadingLabel(label);
    setLoadingProgress(8);
    setLoading(true);
  };

  const finishLoading = async () => {
    setLoadingProgress(100);

    await new Promise<void>(
      (resolve) => {
        window.setTimeout(
          resolve,
          220,
        );
      },
    );

    setLoading(false);
  };

  const loadArchives = async () => {
    beginLoading(
      "กำลังค้นหาแฟ้มปีและเดือน",
    );
    setError("");

    try {
      const result =
        await receivablesArchiveService
          .list();

      setLoadingProgress(82);
      setArchives(result);

      if (result.length > 0) {
        setSelectedYear(
          (current) =>
            current ??
            result[0]
              .buddhistYear,
        );
      }
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      await finishLoading();
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
          .toLocaleLowerCase(
            "th",
          );

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
            archive
              .spreadsheetName,
            archive.monthName,
            String(
              archive
                .buddhistYear,
            ),
          ].some((value) =>
            value
              .toLocaleLowerCase(
                "th",
              )
              .includes(query),
          );
        },
      );
    }, [
      archives,
      folderQuery,
      selectedYear,
    ]);

  const visibleRows =
    useMemo(() => {
      if (!detail) {
        return [];
      }

      const query =
        rowQuery
          .trim()
          .toLocaleLowerCase(
            "th",
          );

      if (!query) {
        return detail.rows;
      }

      return detail.rows.filter(
        (row) =>
          row.values.some(
            (value) =>
              String(
                value || "",
              )
                .toLocaleLowerCase(
                  "th",
                )
                .includes(
                  query,
                ),
          ),
      );
    }, [
      detail,
      rowQuery,
    ]);

  const openArchive = async (
    archive:
      ReceivablesArchiveSummary,
  ) => {
    beginLoading(
      "กำลังเปิดแฟ้ม Google Sheet",
    );
    setError("");
    setSuccess("");
    setChanges({});
    setRowQuery("");

    try {
      setLoadingProgress(35);

      const result =
        await receivablesArchiveService
          .get(
            archive
              .spreadsheetId,
          );

      setLoadingLabel(
        "กำลังจัดเตรียมตารางและรายชื่อชีต",
      );
      setLoadingProgress(88);
      setDetail(result);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      await finishLoading();
    }
  };

  const switchSheet = async (
    sheetName: string,
  ) => {
    if (
      !detail ||
      sheetName ===
        detail.selectedSheet
    ) {
      return;
    }

    if (
      Object.keys(changes)
        .length > 0
    ) {
      setError(
        "กรุณาบันทึกการแก้ไขก่อนเปลี่ยนชีต",
      );
      return;
    }

    beginLoading(
      `กำลังโหลดชีต ${sheetName}`,
    );
    setError("");
    setSuccess("");
    setRowQuery("");

    try {
      setLoadingProgress(42);

      const result =
        await receivablesArchiveService
          .get(
            detail.spreadsheetId,
            sheetName,
          );

      setLoadingProgress(90);
      setDetail(result);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      await finishLoading();
    }
  };

  const updateCell = (
    rowNumber: number,
    column: number,
    value: string,
  ) => {
    const key =
      `${rowNumber}-${column}`;

    setChanges(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );

    setSuccess("");
  };

  const saveChanges =
    async () => {
      if (
        !detail ||
        Object.keys(changes)
          .length === 0
      ) {
        return;
      }

      setSaving(true);
      beginLoading(
        `กำลังบันทึกชีต ${detail.selectedSheet}`,
      );
      setError("");
      setSuccess("");

      try {
        const requestChanges =
          Object.entries(
            changes,
          ).map(
            ([
              key,
              value,
            ]) => {
              const [
                row,
                column,
              ] = key
                .split("-")
                .map(Number);

              return {
                rowNumber: row,
                column,
                value,
              };
            },
          );

        setLoadingProgress(35);

        const result =
          await receivablesArchiveService
            .update(
              detail
                .spreadsheetId,
              detail
                .selectedSheet,
              requestChanges,
            );

        setLoadingProgress(90);
        setDetail(result);
        setChanges({});
        setSuccess(
          `บันทึกข้อมูล ${requestChanges.length.toLocaleString("th-TH")} ช่องเรียบร้อยแล้ว`,
        );
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setSaving(false);
        await finishLoading();
      }
    };

  if (detail) {
    return (
      <div className="mx-auto max-w-[1800px] px-5 py-6 lg:px-8">
        <LoadingOverlay
          open={loading}
          progress={
            loadingProgress
          }
          label={loadingLabel}
        />

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => {
                if (
                  Object.keys(
                    changes,
                  ).length > 0
                ) {
                  setError(
                    "กรุณาบันทึกการแก้ไขก่อนกลับหน้าแฟ้ม",
                  );
                  return;
                }

                setDetail(null);
                setRowQuery("");
                setError("");
                setSuccess("");
              }}
              className="flex items-center gap-2 text-sm text-slate-500 transition hover:text-cyan-700"
            >
              <ArrowLeft
                size={17}
              />
              กลับหน้าแฟ้มปีและเดือน
            </button>

            <p className="mt-4 text-[10px] font-semibold tracking-[0.24em] text-cyan-700">
              SPREADSHEET VIEW
            </p>

            <h2 className="mt-2 truncate text-2xl font-semibold text-slate-900">
              {
                detail
                  .spreadsheetName
              }
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              กำลังดูชีต{" "}
              <span className="font-semibold text-cyan-800">
                {
                  detail
                    .selectedSheet
                }
              </span>
              {" "}— ช่องที่มีสูตรจะถูกล็อกอัตโนมัติ
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void receivablesArchiveService
                  .openGoogleSheet(
                    detail
                      .spreadsheetUrl,
                  );
              }}
              className="flex items-center gap-2 rounded-xl bg-[#063b59] px-4 py-3 text-sm font-medium text-white shadow-md transition hover:bg-[#075071]"
            >
              <ExternalLink
                size={17}
              />
              เปิด Google Sheet
            </button>

            <button
              type="button"
              onClick={() => {
                void receivablesArchiveService
                  .exportExcel(
                    detail
                      .exportUrl,
                  );
              }}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-md transition hover:bg-emerald-700"
            >
              <Download
                size={17}
              />
              Export Excel
            </button>

            <button
              type="button"
              disabled={
                saving ||
                Object.keys(
                  changes,
                ).length === 0
              }
              onClick={() => {
                void saveChanges();
              }}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
            >
              {saving ? (
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Save
                  size={17}
                />
              )}
              บันทึกการแก้ไข
              {Object.keys(
                changes,
              ).length > 0 &&
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
            value={
              detail
                .recordCount
                .toLocaleString(
                  "th-TH",
                )
            }
          />
          <SummaryCard
            label="จำนวนลังรวม"
            value={
              detail
                .totalQuantity
                .toLocaleString(
                  "th-TH",
                )
            }
          />
          <SummaryCard
            label="Exc-vat รวม"
            value={
              detail
                .totalExcVat
                .toLocaleString(
                  "th-TH",
                  {
                    minimumFractionDigits:
                      2,
                    maximumFractionDigits:
                      2,
                  },
                )
            }
          />
        </section>

        {detail.truncated && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            ชีตมีข้อมูลขนาดใหญ่มาก
            ระบบแสดงสูงสุด 1,500 แถวและ 30 คอลัมน์
            หากต้องการดูทั้งหมดให้กด “เปิด Google Sheet”
          </div>
        )}

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
                    event
                      .target
                      .value,
                  )
                }
                placeholder="ค้นหาข้อมูลในชีตที่กำลังเปิด"
                className="w-full rounded-xl border border-cyan-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Sheet
                size={15}
              />
              แสดง{" "}
              {visibleRows.length.toLocaleString(
                "th-TH",
              )}{" "}
              แถว ·{" "}
              {
                detail
                  .columnCount
              }{" "}
              คอลัมน์
            </div>
          </div>

          <div className="max-h-[610px] overflow-auto bg-slate-100">
            <table className="border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="sticky left-0 z-30 h-9 min-w-14 border-b border-r border-slate-300 bg-slate-200 text-center text-[10px] font-medium text-slate-500">
                    #
                  </th>

                  {Array.from({
                    length:
                      detail
                        .columnCount,
                  }).map(
                    (_, index) => (
                      <th
                        key={index}
                        className="h-9 min-w-[150px] border-b border-r border-slate-300 bg-slate-200 px-2 text-center text-xs font-semibold text-slate-600"
                      >
                        {getColumnLabel(
                          index + 1,
                        )}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {visibleRows.map(
                  (row) => (
                    <tr
                      key={
                        row
                          .rowNumber
                      }
                    >
                      <th className="sticky left-0 z-10 h-10 min-w-14 border-b border-r border-slate-300 bg-slate-200 px-2 text-right font-mono text-[11px] font-medium text-slate-500">
                        {
                          row
                            .rowNumber
                        }
                      </th>

                      {Array.from({
                        length:
                          detail
                            .columnCount,
                      }).map(
                        (
                          _,
                          index,
                        ) => {
                          const column =
                            index +
                            1;

                          const key =
                            `${row.rowNumber}-${column}`;

                          const value =
                            changes[
                              key
                            ] ??
                            row
                              .values[
                              index
                            ] ??
                            "";

                          const formula =
                            row
                              .formulas[
                              index
                            ] ||
                            "";

                          const heading =
                            detail
                              .selectedSheet ===
                              "ลูกหนี้" &&
                            row
                              .rowNumber <=
                              3;

                          return (
                            <td
                              key={
                                key
                              }
                              className={[
                                "h-10 min-w-[150px] border-b border-r border-slate-300 p-0",
                                formula
                                  ? "bg-slate-100"
                                  : heading
                                    ? "bg-amber-100"
                                    : "bg-white",
                              ].join(
                                " ",
                              )}
                            >
                              <input
                                data-cell={
                                  key
                                }
                                value={
                                  value
                                }
                                readOnly={
                                  Boolean(
                                    formula,
                                  )
                                }
                                title={
                                  formula ||
                                  undefined
                                }
                                onChange={(
                                  event,
                                ) => {
                                  updateCell(
                                    row
                                      .rowNumber,
                                    column,
                                    event
                                      .target
                                      .value,
                                  );
                                }}
                                onKeyDown={(
                                  event,
                                ) => {
                                  if (
                                    event
                                      .key !==
                                    "Enter"
                                  ) {
                                    return;
                                  }

                                  event.preventDefault();

                                  const next =
                                    document.querySelector<HTMLInputElement>(
                                      `[data-cell="${row.rowNumber + 1}-${column}"]`,
                                    );

                                  next?.focus();
                                  next?.select();
                                }}
                                className={[
                                  "h-10 w-full min-w-[150px] border-0 bg-transparent px-3 text-sm outline-none focus:bg-cyan-50 focus:ring-2 focus:ring-inset focus:ring-cyan-500",
                                  formula
                                    ? "cursor-not-allowed text-slate-500"
                                    : heading
                                      ? "font-semibold text-slate-800"
                                      : "text-slate-800",
                                ].join(
                                  " ",
                                )}
                              />
                            </td>
                          );
                        },
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-300 bg-slate-100 px-3 py-2">
            <span className="mr-2 flex items-center gap-1 text-[10px] font-semibold tracking-[0.14em] text-slate-500">
              <Sheet
                size={14}
              />
              SHEETS
            </span>

            {detail.sheetNames.map(
              (sheetName) => (
                <button
                  key={
                    sheetName
                  }
                  type="button"
                  disabled={
                    loading
                  }
                  onClick={() => {
                    void switchSheet(
                      sheetName,
                    );
                  }}
                  className={[
                    "whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2 text-xs font-medium transition",
                    detail
                      .selectedSheet ===
                      sheetName
                      ? "border-cyan-600 bg-white text-cyan-800 shadow-sm"
                      : "border-transparent text-slate-600 hover:bg-white hover:text-cyan-700",
                  ].join(
                    " ",
                  )}
                >
                  {sheetName}
                </button>
              ),
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
      <LoadingOverlay
        open={loading}
        progress={
          loadingProgress
        }
        label={loadingLabel}
      />

      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-5 flex items-center gap-2 text-sm text-slate-500 transition hover:text-cyan-700"
          >
            <ArrowLeft
              size={17}
            />
            กลับหน้าศูนย์แฟ้มข้อมูล
          </button>

          <p className="text-[10px] font-semibold tracking-[0.24em] text-cyan-700">
            RECEIVABLES &amp; FREIGHT ARCHIVE
          </p>

          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            แฟ้มข้อมูลลูกหนี้–ค่าขนส่ง
          </h2>

          <p className="mt-3 text-sm text-slate-500">
            ค้นหาแฟ้มตามปีและเดือน
            เปิดดูทุกชีต แก้ไขข้อมูล และ Export เป็น Excel
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            void loadArchives();
          }}
          className="flex items-center gap-2 rounded-xl bg-[#063b59] px-5 py-3 text-sm font-medium text-white shadow-md transition hover:bg-[#075071] disabled:opacity-50"
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

      <section className="mt-6 rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-700"
          />
          <input
            value={
              folderQuery
            }
            onChange={(
              event,
            ) =>
              setFolderQuery(
                event
                  .target
                  .value,
              )
            }
            placeholder="ค้นหาเดือน ปี หรือชื่อแฟ้ม"
            className="w-full rounded-xl border border-cyan-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white"
          />
        </div>
      </section>

      {!loading &&
        archives.length ===
          0 && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white py-20 text-center text-sm text-slate-500">
            ยังไม่พบแฟ้มข้อมูลลูกหนี้–ค่าขนส่ง
          </section>
        )}

      {archives.length >
        0 && (
        <>
          <section className="mt-8">
            <div className="flex items-center gap-2">
              <Folder
                size={19}
                className="text-cyan-700"
              />
              <h3 className="text-lg font-semibold text-slate-900">
                แฟ้มปี
              </h3>
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              {years.map(
                (year) => {
                  const count =
                    archives.filter(
                      (
                        archive,
                      ) =>
                        archive
                          .buddhistYear ===
                        year,
                    ).length;

                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() =>
                        setSelectedYear(
                          year,
                        )
                      }
                      className={[
                        "flex min-w-40 items-center gap-3 rounded-xl border px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5",
                        selectedYear ===
                          year
                          ? "border-cyan-500 bg-[#063b59] text-white"
                          : "border-cyan-200 bg-white text-slate-800 hover:bg-cyan-50",
                      ].join(
                        " ",
                      )}
                    >
                      <Folder
                        size={21}
                      />
                      <span>
                        <span className="block text-base font-semibold">
                          ปี {year}
                        </span>
                        <span
                          className={[
                            "block text-[10px]",
                            selectedYear ===
                              year
                              ? "text-cyan-100"
                              : "text-slate-500",
                          ].join(
                            " ",
                          )}
                        >
                          {count} เดือน
                        </span>
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </section>

          <section className="mt-7">
            <div className="flex items-center gap-2">
              <CalendarDays
                size={19}
                className="text-amber-600"
              />
              <h3 className="text-lg font-semibold text-slate-900">
                แฟ้มเดือน ปี{" "}
                {
                  selectedYear
                }
              </h3>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {visibleArchives.map(
                (
                  archive,
                ) => (
                  <button
                    key={
                      archive
                        .spreadsheetId
                    }
                    type="button"
                    onClick={() => {
                      void openArchive(
                        archive,
                      );
                    }}
                    className="group min-h-[150px] rounded-2xl border border-amber-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-amber-400 hover:bg-amber-50/40 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600">
                        <FileSpreadsheet
                          size={20}
                        />
                      </span>

                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">
                        พร้อม
                      </span>
                    </div>

                    <p className="mt-3 text-lg font-semibold text-slate-900">
                      {
                        archive
                          .monthName
                      }
                    </p>

                    <p className="text-xs font-medium text-cyan-700">
                      พ.ศ.{" "}
                      {
                        archive
                          .buddhistYear
                      }
                    </p>

                    <p className="mt-3 truncate text-[10px] text-slate-400">
                      แก้ไข{" "}
                      {formatDateTime(
                        archive
                          .modifiedAt,
                      )}
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

function LoadingOverlay({
  open,
  progress,
  label,
}: {
  open: boolean;
  progress: number;
  label: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-cyan-200 bg-white p-7 shadow-2xl">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
            <LoaderCircle
              size={26}
              className="animate-spin"
            />
          </span>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              {label ||
                "กำลังโหลดข้อมูล"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              กรุณารอสักครู่
            </p>
          </div>

          <span className="ml-auto text-2xl font-semibold tabular-nums text-cyan-700">
            {Math.round(
              progress,
            )}
            %
          </span>
        </div>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-200"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>
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
    <div className="rounded-2xl border border-cyan-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-900">
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
  if (
    !error &&
    !success
  ) {
    return null;
  }

  return (
    <div
      className={[
        "mt-5 rounded-xl border px-5 py-4 text-sm",
        error
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
      ].join(" ")}
    >
      {error || success}
    </div>
  );
}

function getColumnLabel(
  column: number,
) {
  let value = column;
  let label = "";

  while (value > 0) {
    const remainder =
      (value - 1) % 26;

    label =
      String.fromCharCode(
        65 + remainder,
      ) + label;

    value = Math.floor(
      (value - 1) / 26,
    );
  }

  return label;
}

function formatDateTime(
  value: string,
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "th-TH",
    {
      dateStyle:
        "short",
      timeStyle:
        "short",
    },
  );
}

function getErrorMessage(
  error: unknown,
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return String(error);
}
