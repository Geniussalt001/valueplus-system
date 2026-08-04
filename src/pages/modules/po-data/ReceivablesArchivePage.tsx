import {
  type CSSProperties,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  Download,
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
    selectedCell,
    setSelectedCell,
  ] = useState<{
    rowNumber: number;
    column: number;
  } | null>(null);

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

  const beginLoading = (
    label: string,
  ) => {
    setLoadingLabel(label);
    setLoading(true);
  };

  const finishLoading = () => {
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
      finishLoading();
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
      "กำลังเปิด Google Sheets Editor",
    );
    setError("");
    setSuccess("");

    try {
      await receivablesArchiveService
        .openGoogleSheetEditor(
          archive
            .spreadsheetId,
          archive
            .spreadsheetName,
        );

      setLoadingLabel(
        "เปิด Google Sheets Editor เรียบร้อยแล้ว",
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      finishLoading();
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
    setSelectedCell(null);

    try {
      const result =
        await receivablesArchiveService
          .get(
            detail.spreadsheetId,
            sheetName,
          );

      setDetail(result);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      finishLoading();
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

        const result =
          await receivablesArchiveService
            .update(
              detail
                .spreadsheetId,
              detail
                .selectedSheet,
              requestChanges,
            );

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
        finishLoading();
      }
    };

  if (detail) {
    const selectedRow =
      selectedCell
        ? detail.rows.find(
            (row) =>
              row.rowNumber ===
              selectedCell.rowNumber,
          )
        : null;

    const selectedKey =
      selectedCell
        ? `${selectedCell.rowNumber}-${selectedCell.column}`
        : "";

    const selectedFormula =
      selectedCell &&
      selectedRow
        ? selectedRow.formulas[
            selectedCell.column -
              1
          ] || ""
        : "";

    const selectedValue =
      selectedCell &&
      selectedRow
        ? changes[selectedKey] ??
          selectedRow.values[
            selectedCell.column -
              1
          ] ??
          ""
        : "";

    return (
      <div className="mx-auto max-w-none px-3 py-4 lg:px-5">
        <LoadingOverlay
          open={loading}
          label={loadingLabel}
        />

        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
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
                setSelectedCell(
                  null,
                );
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

            <div className="mt-3 flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <FileSpreadsheet
                  size={22}
                />
              </span>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.22em] text-emerald-700">
                  VALUEPLUS SPREADSHEET
                </p>
                <h2 className="mt-1 truncate text-xl font-semibold text-slate-900">
                  {
                    detail
                      .spreadsheetName
                  }
                </h2>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs text-slate-600">
              {detail.recordCount.toLocaleString(
                "th-TH",
              )}{" "}
              Invoice ·{" "}
              {detail.totalQuantity.toLocaleString(
                "th-TH",
              )}{" "}
              ลัง ·{" "}
              {detail.totalExcVat.toLocaleString(
                "th-TH",
                {
                  minimumFractionDigits:
                    2,
                  maximumFractionDigits:
                    2,
                },
              )}{" "}
              บาท
            </span>

            <button
              type="button"
              onClick={() => {
                void receivablesArchiveService
                  .exportExcel(
                    detail
                      .exportUrl,
                  );
              }}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-emerald-700"
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
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
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
              บันทึก
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

        {detail.truncated && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            แฟ้มมีข้อมูลขนาดใหญ่มาก
            ระบบกำลังแสดง 1,500 แถวแรกและ 40 คอลัมน์แรก
          </div>
        )}

        <section className="mt-3 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
          <div className="flex items-center gap-5 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-700">
            {[
              "ไฟล์",
              "แก้ไข",
              "ดู",
              "แทรก",
              "รูปแบบ",
              "ข้อมูล",
              "เครื่องมือ",
            ].map(
              (menu) => (
                <span
                  key={menu}
                  className="whitespace-nowrap"
                >
                  {menu}
                </span>
              ),
            )}

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Search
                size={15}
                className="text-slate-500"
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
                placeholder="ค้นหาในชีต"
                className="w-52 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-cyan-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center border-b border-slate-300 bg-slate-50">
            <div className="w-24 shrink-0 border-r border-slate-300 px-3 py-2 text-center text-xs font-medium text-slate-700">
              {selectedCell
                ? `${getColumnLabel(
                    selectedCell.column,
                  )}${selectedCell.rowNumber}`
                : "—"}
            </div>

            <div className="shrink-0 border-r border-slate-300 px-3 py-2 font-serif text-sm italic text-slate-500">
              fx
            </div>

            <input
              value={
                selectedFormula ||
                selectedValue
              }
              readOnly={
                !selectedCell ||
                Boolean(
                  selectedFormula,
                )
              }
              onChange={(event) => {
                if (
                  !selectedCell ||
                  selectedFormula
                ) {
                  return;
                }

                updateCell(
                  selectedCell
                    .rowNumber,
                  selectedCell
                    .column,
                  event.target.value,
                );
              }}
              placeholder="เลือกเซลล์เพื่อดูหรือแก้ไขข้อมูล"
              className="h-9 min-w-0 flex-1 border-0 bg-white px-3 text-sm text-slate-800 outline-none read-only:bg-slate-50 read-only:text-slate-500"
            />
          </div>

          <div className="max-h-[calc(100vh-285px)] min-h-[520px] overflow-auto bg-white">
            <table className="border-separate border-spacing-0 text-sm">
              <colgroup>
                <col
                  style={{
                    width: 52,
                  }}
                />
                {detail.columnWidths.map(
                  (
                    width,
                    index,
                  ) => (
                    <col
                      key={index}
                      style={{
                        width:
                          Math.max(
                            55,
                            Math.min(
                              width,
                              420,
                            ),
                          ),
                      }}
                    />
                  ),
                )}
              </colgroup>

              <thead className="sticky top-0 z-30">
                <tr>
                  <th className="sticky left-0 z-40 h-8 min-w-[52px] border-b border-r border-slate-300 bg-slate-200" />

                  {Array.from({
                    length:
                      detail
                        .columnCount,
                  }).map(
                    (_, index) => (
                      <th
                        key={index}
                        style={{
                          minWidth:
                            Math.max(
                              55,
                              Math.min(
                                detail
                                  .columnWidths[
                                  index
                                ] ||
                                  100,
                                420,
                              ),
                            ),
                        }}
                        className="h-8 border-b border-r border-slate-300 bg-slate-200 px-2 text-center text-xs font-medium text-slate-600"
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
                        row.rowNumber
                      }
                    >
                      <th className="sticky left-0 z-20 h-8 min-w-[52px] border-b border-r border-slate-300 bg-slate-100 px-2 text-right text-[11px] font-normal text-slate-500">
                        {
                          row
                            .rowNumber
                        }
                      </th>

                      {row.values.map(
                        (
                          value,
                          index,
                        ) => {
                          const column =
                            index +
                            1;

                          const merge =
                            getMergeInfo(
                              detail,
                              row
                                .rowNumber,
                              column,
                            );

                          if (
                            merge.covered
                          ) {
                            return null;
                          }

                          const formula =
                            row.formulas[
                              index
                            ] || "";

                          const key =
                            `${row.rowNumber}-${column}`;

                          const cellValue =
                            changes[
                              key
                            ] ??
                            value;

                          const style =
                            detail.styles[
                              row.styleIds[
                                index
                              ] || 0
                            ];

                          const active =
                            selectedCell
                              ?.rowNumber ===
                              row.rowNumber &&
                            selectedCell
                              .column ===
                              column;

                          return (
                            <td
                              key={
                                column
                              }
                              rowSpan={
                                merge
                                  .rowSpan
                              }
                              colSpan={
                                merge
                                  .colSpan
                              }
                              style={getCellStyle(
                                style,
                              )}
                              className={[
                                "relative border-b border-r border-slate-300 p-0",
                                active
                                  ? "z-10 ring-2 ring-inset ring-emerald-500"
                                  : "",
                              ].join(
                                " ",
                              )}
                            >
                              <input
                                data-cell={key}
                                value={
                                  cellValue
                                }
                                title={
                                  formula ||
                                  cellValue
                                }
                                readOnly={
                                  Boolean(
                                    formula,
                                  )
                                }
                                onFocus={() =>
                                  setSelectedCell({
                                    rowNumber:
                                      row
                                        .rowNumber,
                                    column,
                                  })
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateCell(
                                    row
                                      .rowNumber,
                                    column,
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                onKeyDown={(
                                  event,
                                ) => {
                                  if (
                                    event.key !==
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
                                className="h-full min-h-8 w-full border-0 bg-transparent px-2 py-1 text-inherit outline-none read-only:cursor-default focus:bg-white/20"
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

          <div className="flex items-end gap-1 overflow-x-auto border-t border-slate-300 bg-slate-100 px-3 pt-2">
            <span className="mr-2 flex h-9 items-center gap-1 px-2 text-[10px] font-semibold tracking-[0.12em] text-slate-500">
              <Sheet
                size={14}
              />
              ชีต
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
                    "h-9 whitespace-nowrap rounded-t-lg border border-b-0 px-5 text-xs font-medium transition",
                    detail
                      .selectedSheet ===
                      sheetName
                      ? "border-slate-300 bg-white text-emerald-700 shadow-sm"
                      : "border-transparent bg-slate-100 text-slate-600 hover:bg-white",
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
  label,
}: {
  open: boolean;
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

        </div>

        <div
          className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label="กำลังดำเนินการ"
        >
          <div className="loading-bar h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" />
        </div>
      </div>
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

function getMergeInfo(
  detail: ReceivablesArchiveDetail,
  row: number,
  column: number,
) {
  for (
    const range of
      detail.mergedRanges
  ) {
    const lastRow =
      range.row +
      range.rowCount -
      1;

    const lastColumn =
      range.column +
      range.columnCount -
      1;

    if (
      row < range.row ||
      row > lastRow ||
      column <
        range.column ||
      column >
        lastColumn
    ) {
      continue;
    }

    const startsHere =
      row === range.row &&
      column ===
        range.column;

    return {
      covered:
        !startsHere,
      rowSpan:
        startsHere
          ? range.rowCount
          : undefined,
      colSpan:
        startsHere
          ? range.columnCount
          : undefined,
    };
  }

  return {
    covered: false,
    rowSpan: undefined,
    colSpan: undefined,
  };
}

function getCellStyle(
  style:
    ReceivablesArchiveDetail[
      "styles"
    ][number] |
    undefined,
): CSSProperties {
  if (!style) {
    return {
      backgroundColor:
        "#ffffff",
      color: "#0f172a",
      textAlign: "left",
      verticalAlign:
        "middle",
    };
  }

  const alignment =
    [
      "left",
      "center",
      "right",
    ].includes(
      style
        .horizontalAlignment,
    )
      ? style
          .horizontalAlignment as
          CSSProperties[
            "textAlign"
          ]
      : "left";

  return {
    backgroundColor:
      style.background,
    color:
      style.fontColor,
    fontWeight:
      style.fontWeight ===
      "bold"
        ? 700
        : 400,
    fontStyle:
      style.fontStyle ===
      "italic"
        ? "italic"
        : "normal",
    fontSize:
      Math.max(
        9,
        Math.min(
          style.fontSize,
          24,
        ),
      ),
    fontFamily:
      style.fontFamily,
    textAlign:
      alignment,
    verticalAlign:
      style.verticalAlignment ===
      "top"
        ? "top"
        : style
              .verticalAlignment ===
            "bottom"
          ? "bottom"
          : "middle",
    whiteSpace:
      style.wrapStrategy
        .toUpperCase()
        .includes("WRAP")
        ? "normal"
        : "nowrap",
  };
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
