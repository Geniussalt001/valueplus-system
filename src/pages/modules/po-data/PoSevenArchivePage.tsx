import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  Archive,
  ArrowLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Folder,
  FolderArchive,
  LoaderCircle,
  RefreshCw,
  Search,
  Warehouse,
  X,
} from "lucide-react";

import {
  openUrl,
} from "@tauri-apps/plugin-opener";

import {
  ProcessStatusOverlay,
} from "../../../components/common/ProcessStatusOverlay";

import type {
  AppUser,
} from "../../../auth/auth.types";

import {
  poArchiveService,
} from "../../../services/poArchiveService";

import {
  APPS_SCRIPT_SYNC_COMPLETED_EVENT,
} from "../../../services/appsScriptClient";

import type {
  PoArchiveRecord,
} from "../../../types/poArchive.types";

import {
  base64ToPdfUrl,
} from "../../../utils/fileEncoding";

interface PoSevenArchivePageProps {
  currentUser: AppUser;
  onBack: () => void;
}

interface ArchiveDate {
  year: number;
  month: number;
  day: number;
}

interface FolderItem {
  key: number;
  label: string;
  records: PoArchiveRecord[];
}

const thaiMonths = [
  "",
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export function PoSevenArchivePage({
  onBack,
}: PoSevenArchivePageProps) {
  const [records, setRecords] =
    useState<PoArchiveRecord[]>([]);
  const [search, setSearch] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");
  const [previewUrl, setPreviewUrl] =
    useState("");
  const [previewName, setPreviewName] =
    useState("");
  const [openingId, setOpeningId] =
    useState("");
  const [selectedYear, setSelectedYear] =
    useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] =
    useState<number | null>(null);
  const [selectedDay, setSelectedDay] =
    useState<number | null>(null);
  const [downloading, setDownloading] =
    useState(false);
  const [
    downloadProgress,
    setDownloadProgress,
  ] = useState({
    current: 0,
    total: 0,
  });

  const loadRecords =
    useCallback(async () => {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const nextRecords =
          await poArchiveService.list();

        setRecords(
          Array.isArray(nextRecords)
            ? nextRecords
            : [],
        );
      } catch (reason) {
        setError(
          getErrorMessage(reason),
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const handleCompletedSync = (
      event: Event,
    ) => {
      const action = String(
        (
          event as CustomEvent<{
            action?: string;
          }>
        ).detail?.action || "",
      );

      if (
        action ===
        "archive.uploadPdf"
      ) {
        void loadRecords();
      }
    };

    window.addEventListener(
      APPS_SCRIPT_SYNC_COMPLETED_EVENT,
      handleCompletedSync,
    );

    return () => {
      window.removeEventListener(
        APPS_SCRIPT_SYNC_COMPLETED_EVENT,
        handleCompletedSync,
      );
    };
  }, [loadRecords]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl,
        );
      }
    };
  }, [previewUrl]);

  const filteredRecords =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return records;
      }

      return records.filter(
        (record) =>
          record.poNumber
            .toLowerCase()
            .includes(keyword) ||
          record.warehouse
            .toLowerCase()
            .includes(keyword) ||
          record.fileName
            .toLowerCase()
            .includes(keyword) ||
          record.documentDate
            .toLowerCase()
            .includes(keyword) ||
          formatThaiDate(
            record.documentDate,
          )
            .toLowerCase()
            .includes(keyword),
      );
    }, [records, search]);

  const datedRecords =
    useMemo(
      () =>
        records
          .map((record) => ({
            record,
            date: parseArchiveDate(
              record.documentDate,
            ),
          }))
          .filter(
            (
              item,
            ): item is {
              record: PoArchiveRecord;
              date: ArchiveDate;
            } => Boolean(item.date),
          ),
      [records],
    );

  const yearFolders =
    useMemo<FolderItem[]>(() => {
      const groups =
        new Map<
          number,
          PoArchiveRecord[]
        >();

      datedRecords.forEach(
        ({ record, date }) => {
          const group =
            groups.get(date.year) ??
            [];

          group.push(record);
          groups.set(
            date.year,
            group,
          );
        },
      );

      return Array.from(
        groups.entries(),
      )
        .sort(
          ([first], [second]) =>
            second - first,
        )
        .map(([year, items]) => ({
          key: year,
          label: `ปี ${toBuddhistYear(year)}`,
          records: items,
        }));
    }, [datedRecords]);

  const monthFolders =
    useMemo<FolderItem[]>(() => {
      if (selectedYear === null) {
        return [];
      }

      const groups =
        new Map<
          number,
          PoArchiveRecord[]
        >();

      datedRecords
        .filter(
          ({ date }) =>
            date.year ===
            selectedYear,
        )
        .forEach(
          ({ record, date }) => {
            const group =
              groups.get(
                date.month,
              ) ?? [];

            group.push(record);
            groups.set(
              date.month,
              group,
            );
          },
        );

      return Array.from(
        groups.entries(),
      )
        .sort(
          ([first], [second]) =>
            second - first,
        )
        .map(([month, items]) => ({
          key: month,
          label:
            thaiMonths[month],
          records: items,
        }));
    }, [
      datedRecords,
      selectedYear,
    ]);

  const dayFolders =
    useMemo<FolderItem[]>(() => {
      if (
        selectedYear === null ||
        selectedMonth === null
      ) {
        return [];
      }

      const groups =
        new Map<
          number,
          PoArchiveRecord[]
        >();

      datedRecords
        .filter(
          ({ date }) =>
            date.year ===
              selectedYear &&
            date.month ===
              selectedMonth,
        )
        .forEach(
          ({ record, date }) => {
            const group =
              groups.get(date.day) ??
              [];

            group.push(record);
            groups.set(
              date.day,
              group,
            );
          },
        );

      return Array.from(
        groups.entries(),
      )
        .sort(
          ([first], [second]) =>
            second - first,
        )
        .map(([day, items]) => ({
          key: day,
          label: `วันที่ ${day}`,
          records: items,
        }));
    }, [
      datedRecords,
      selectedMonth,
      selectedYear,
    ]);

  const dayRecords =
    useMemo(() => {
      if (
        selectedYear === null ||
        selectedMonth === null ||
        selectedDay === null
      ) {
        return [];
      }

      return datedRecords
        .filter(
          ({ date }) =>
            date.year ===
              selectedYear &&
            date.month ===
              selectedMonth &&
            date.day === selectedDay,
        )
        .map(({ record }) => record)
        .sort((first, second) =>
          first.poNumber.localeCompare(
            second.poNumber,
            "th",
            {
              numeric: true,
            },
          ),
        );
    }, [
      datedRecords,
      selectedDay,
      selectedMonth,
      selectedYear,
    ]);

  const warehouseCount =
    useMemo(
      () =>
        new Set(
          records
            .map(
              (record) =>
                record.warehouse,
            )
            .filter(Boolean),
        ).size,
      [records],
    );

  const totalSize =
    useMemo(
      () =>
        records.reduce(
          (total, record) =>
            total +
            Number(
              record.fileSize || 0,
            ),
          0,
        ),
      [records],
    );

  const openPreview = async (
    record: PoArchiveRecord,
  ) => {
    setOpeningId(record.id);
    setError("");
    setSuccess("");

    try {
      const pdf =
        await poArchiveService
          .getPdf(
            record.id,
            record.fileId,
            record.fileName,
          );

      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl,
        );
      }

      setPreviewUrl(
        base64ToPdfUrl(
          pdf.base64Data,
        ),
      );
      setPreviewName(
        pdf.fileName,
      );
    } catch (reason) {
      setError(
        getErrorMessage(reason),
      );
    } finally {
      setOpeningId("");
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl,
      );
    }

    setPreviewUrl("");
    setPreviewName("");
  };

  const downloadAll = async () => {
    if (
      dayRecords.length === 0 ||
      downloading
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const folderPath =
        await poArchiveService
          .selectDownloadFolder();

      if (!folderPath) {
        return;
      }

      setDownloading(true);
      setDownloadProgress({
        current: 0,
        total: dayRecords.length,
      });

      for (
        let index = 0;
        index <
        dayRecords.length;
        index += 1
      ) {
        const record =
          dayRecords[index];

        const pdf =
          await poArchiveService
            .getPdf(
              record.id,
              record.fileId,
              record.fileName,
            );

        await poArchiveService
          .savePdf(
            folderPath,
            pdf,
          );

        setDownloadProgress({
          current: index + 1,
          total:
            dayRecords.length,
        });
      }

      setSuccess(
        `ดาวน์โหลด ${dayRecords.length} ไฟล์เรียบร้อยแล้ว`,
      );
    } catch (reason) {
      setError(
        getErrorMessage(reason),
      );
    } finally {
      setDownloading(false);
    }
  };

  const searching =
    search.trim().length > 0;

  const currentFolders =
    selectedYear === null
      ? yearFolders
      : selectedMonth === null
        ? monthFolders
        : dayFolders;

  const currentFolderTitle =
    selectedYear === null
      ? "แฟ้มปี"
      : selectedMonth === null
        ? `ปี ${toBuddhistYear(
            selectedYear,
          )}`
        : selectedDay === null
          ? `${
              thaiMonths[
                selectedMonth
              ]
            } ${toBuddhistYear(
              selectedYear,
            )}`
          : `วันที่ ${selectedDay} ${
              thaiMonths[
                selectedMonth
              ]
            } ${toBuddhistYear(
              selectedYear,
            )}`;

  return (
    <div
      className="
        mx-auto
        max-w-[1500px]
        px-6
        py-8
        lg:px-10
      "
    >
      <ProcessStatusOverlay
        open={
          loading ||
          downloading ||
          Boolean(openingId)
        }
        title={
          downloading
            ? `กำลังดาวน์โหลดเอกสาร ${downloadProgress.current}/${downloadProgress.total}`
            : openingId
              ? "กำลังเตรียมเอกสาร PDF Preview..."
              : "กำลังโหลดแฟ้มข้อมูล PO Seven..."
        }
        progress={
          downloading &&
          downloadProgress.total > 0
            ? (downloadProgress.current /
                downloadProgress.total) *
              100
            : undefined
        }
      />
      <header
        className="
          flex
          items-end
          justify-between
          gap-5
        "
      >
        <div>
          <button
            type="button"
            onClick={onBack}
            className="
              mb-5
              flex
              items-center
              gap-2
              text-sm
              text-slate-500
              transition
              hover:text-cyan-700
            "
          >
            <ArrowLeft size={17} />
            กลับ
          </button>

          <p
            className="
              text-[10px]
              font-semibold
              tracking-[0.24em]
              text-cyan-700
            "
          >
            SEVEN PO ARCHIVE
          </p>

          <h2
            className="
              mt-2
              text-3xl
              font-semibold
              text-slate-900
            "
          >
            แฟ้มข้อมูล PO Seven
          </h2>
        </div>

        <div
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-xl
            border
            border-cyan-300
            bg-cyan-50
            text-cyan-700
          "
        >
          <FolderArchive
            size={23}
          />
        </div>
      </header>

      <section
        className="
          mt-7
          grid
          gap-4
          sm:grid-cols-3
        "
      >
        <StatCard
          label="เอกสาร"
          value={records.length}
          icon={<Archive size={18} />}
        />
        <StatCard
          label="คลัง"
          value={warehouseCount}
          icon={<Warehouse size={18} />}
        />
        <StatCard
          label="ขนาด"
          value={formatFileSize(totalSize)}
          icon={<FileText size={18} />}
        />
      </section>

      <section
        className="
          mt-5
          flex
          flex-col
          gap-3
          rounded-2xl
          border
          border-cyan-200
          bg-white/90
          p-4
          shadow-sm
          md:flex-row
          md:items-center
        "
      >
        <label
          className="
            flex
            min-h-11
            flex-1
            items-center
            gap-3
            rounded-xl
            border
            border-slate-200
            bg-slate-50
            px-4
          "
        >
          <Search
            className="text-cyan-600"
            size={18}
          />
          <input
            value={search}
            onChange={(event) => {
              setSearch(
                event.target.value,
              );
            }}
            placeholder="ค้นหา PO คลัง วันที่ หรือชื่อไฟล์"
            className="
              w-full
              bg-transparent
              text-sm
              text-slate-900
              outline-none
              placeholder:text-slate-400
            "
          />
        </label>

        <button
          type="button"
          onClick={() => {
            void loadRecords();
          }}
          disabled={loading}
          className="
            flex
            min-h-11
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-[#063b59]
            px-5
            text-sm
            font-semibold
            text-white
            shadow-md
            transition
            hover:bg-[#075071]
            disabled:opacity-50
          "
        >
          <RefreshCw
            className={
              loading
                ? "animate-spin"
                : ""
            }
            size={17}
          />
          โหลดใหม่
        </button>
      </section>

      {error && (
        <div
          className="
            mt-5
            rounded-xl
            border
            border-red-200
            bg-red-50
            px-5
            py-4
            text-sm
            text-red-700
          "
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="
            mt-5
            rounded-xl
            border
            border-emerald-200
            bg-emerald-50
            px-5
            py-4
            text-sm
            text-emerald-700
          "
        >
          {success}
        </div>
      )}

      <section
        className="
          mt-5
          overflow-hidden
          rounded-2xl
          border
          border-cyan-200
          bg-white
          shadow-sm
        "
      >
        <div
          className="
            flex
            flex-col
            gap-3
            border-b
            border-slate-200
            px-5
            py-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <FolderBreadcrumbs
              selectedYear={
                selectedYear
              }
              selectedMonth={
                selectedMonth
              }
              selectedDay={
                selectedDay
              }
              searching={searching}
              onRoot={() => {
                setSelectedYear(null);
                setSelectedMonth(null);
                setSelectedDay(null);
                setSearch("");
              }}
              onYear={() => {
                setSelectedMonth(null);
                setSelectedDay(null);
              }}
              onMonth={() => {
                setSelectedDay(null);
              }}
            />
            <h3 className="mt-2 font-semibold text-slate-900">
              {searching
                ? "ผลการค้นหา"
                : currentFolderTitle}
            </h3>
          </div>

          {!searching &&
            selectedDay !== null && (
              <button
                type="button"
                onClick={() => {
                  void downloadAll();
                }}
                disabled={
                  downloading ||
                  dayRecords.length === 0
                }
                className="
                  flex
                  min-h-11
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-emerald-600
                  px-5
                  text-sm
                  font-semibold
                  text-white
                  shadow-md
                  transition
                  hover:bg-emerald-700
                  disabled:opacity-50
                "
              >
                {downloading ? (
                  <LoaderCircle
                    className="animate-spin"
                    size={17}
                  />
                ) : (
                  <Download size={17} />
                )}
                {downloading
                  ? `กำลังดาวน์โหลด ${downloadProgress.current}/${downloadProgress.total}`
                  : `ดาวน์โหลดทั้งหมด (${dayRecords.length})`}
              </button>
            )}
        </div>

        {loading ? (
          <EmptyState
            loading
            text="กำลังโหลด..."
          />
        ) : searching ? (
          filteredRecords.length >
          0 ? (
            <FileTable
              records={
                filteredRecords
              }
              openingId={openingId}
              onPreview={openPreview}
            />
          ) : (
            <EmptyState
              text="ไม่พบเอกสาร"
            />
          )
        ) : selectedDay !== null ? (
          dayRecords.length > 0 ? (
            <FileTable
              records={dayRecords}
              openingId={openingId}
              onPreview={openPreview}
            />
          ) : (
            <EmptyState
              text="ไม่พบเอกสาร"
            />
          )
        ) : currentFolders.length >
          0 ? (
          <div
            className="
              grid
              gap-3
              p-5
              sm:grid-cols-2
              lg:grid-cols-3
              xl:grid-cols-4
            "
          >
            {currentFolders.map(
              (folder) => (
                <FolderCard
                  key={folder.key}
                  label={folder.label}
                  records={
                    folder.records
                  }
                  onClick={() => {
                    if (
                      selectedYear ===
                      null
                    ) {
                      setSelectedYear(
                        folder.key,
                      );
                    } else if (
                      selectedMonth ===
                      null
                    ) {
                      setSelectedMonth(
                        folder.key,
                      );
                    } else {
                      setSelectedDay(
                        folder.key,
                      );
                    }
                  }}
                />
              ),
            )}
          </div>
        ) : (
          <EmptyState
            text="ยังไม่มีแฟ้มเอกสาร"
          />
        )}
      </section>

      {previewUrl && (
        <ArchivePdfPreview
          fileName={previewName}
          fileUrl={previewUrl}
          onClose={closePreview}
        />
      )}
    </div>
  );
}

function ArchivePdfPreview({
  fileName,
  fileUrl,
  onClose,
}: {
  fileName: string;
  fileUrl: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/65 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${fileName}`}
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="flex h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-cyan-700">
              PDF PREVIEW
            </p>
            <p className="mt-1 truncate font-semibold text-slate-900">
              {fileName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            aria-label="ปิด Preview"
          >
            <X size={18} />
            ปิด
          </button>
        </header>

        <iframe
          title={fileName}
          src={fileUrl}
          className="min-h-0 flex-1 border-0 bg-slate-100"
        />
      </div>
    </div>,
    document.body,
  );
}

function FolderBreadcrumbs({
  selectedYear,
  selectedMonth,
  selectedDay,
  searching,
  onRoot,
  onYear,
  onMonth,
}: {
  selectedYear: number | null;
  selectedMonth: number | null;
  selectedDay: number | null;
  searching: boolean;
  onRoot: () => void;
  onYear: () => void;
  onMonth: () => void;
}) {
  return (
    <div
      className="
        flex
        flex-wrap
        items-center
        gap-1.5
        text-xs
        text-slate-500
      "
    >
      <button
        type="button"
        onClick={onRoot}
        className="
          font-semibold
          text-cyan-700
          hover:underline
        "
      >
        แฟ้ม PO Seven
      </button>

      {searching && (
        <>
          <ChevronRight size={14} />
          <span>ค้นหา</span>
        </>
      )}

      {!searching &&
        selectedYear !== null && (
          <>
            <ChevronRight size={14} />
            <button
              type="button"
              onClick={onYear}
              className="
                hover:text-cyan-700
              "
            >
              ปี{" "}
              {toBuddhistYear(
                selectedYear,
              )}
            </button>
          </>
        )}

      {!searching &&
        selectedMonth !== null && (
          <>
            <ChevronRight size={14} />
            <button
              type="button"
              onClick={onMonth}
              className="
                hover:text-cyan-700
              "
            >
              {
                thaiMonths[
                  selectedMonth
                ]
              }
            </button>
          </>
        )}

      {!searching &&
        selectedDay !== null && (
          <>
            <ChevronRight size={14} />
            <span>
              วันที่ {selectedDay}
            </span>
          </>
        )}
    </div>
  );
}

function FolderCard({
  label,
  records,
  onClick,
}: {
  label: string;
  records: PoArchiveRecord[];
  onClick: () => void;
}) {
  const size = records.reduce(
    (total, record) =>
      total +
      Number(record.fileSize || 0),
    0,
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group
        flex
        min-h-28
        items-center
        gap-4
        rounded-xl
        border
        border-cyan-200
        bg-gradient-to-br
        from-white
        to-cyan-50
        p-4
        text-left
        shadow-sm
        transition
        hover:-translate-y-0.5
        hover:border-cyan-400
        hover:shadow-md
      "
    >
      <div
        className="
          flex
          h-12
          w-12
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-cyan-100
          text-cyan-700
        "
      >
        <Folder size={25} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="
            truncate
            font-semibold
            text-slate-900
          "
        >
          {label}
        </p>
        <p
          className="
            mt-1
            text-xs
            text-slate-500
          "
        >
          {records.length} ไฟล์ ·{" "}
          {formatFileSize(size)}
        </p>
      </div>

      <ChevronRight
        className="
          shrink-0
          text-slate-400
          transition
          group-hover:translate-x-0.5
          group-hover:text-cyan-700
        "
        size={18}
      />
    </button>
  );
}

function FileTable({
  records,
  openingId,
  onPreview,
}: {
  records: PoArchiveRecord[];
  openingId: string;
  onPreview: (
    record: PoArchiveRecord,
  ) => Promise<void>;
}) {
  return (
    <div className="overflow-x-auto">
      <table
        className="
          w-full
          min-w-[880px]
          text-left
        "
      >
        <thead
          className="
            bg-cyan-50
            text-xs
            text-slate-600
          "
        >
          <tr>
            <th className="px-5 py-3">
              เลข PO
            </th>
            <th className="px-5 py-3">
              วันที่
            </th>
            <th className="px-5 py-3">
              คลัง
            </th>
            <th className="px-5 py-3">
              ชื่อไฟล์
            </th>
            <th className="px-5 py-3">
              ขนาด
            </th>
            <th className="px-5 py-3 text-right">
              เปิด
            </th>
          </tr>
        </thead>

        <tbody
          className="
            divide-y
            divide-slate-100
            text-sm
          "
        >
          {records.map((record) => (
            <tr
              key={record.id}
              className="
                transition
                hover:bg-cyan-50/60
              "
            >
              <td
                className="
                  px-5
                  py-4
                  font-semibold
                  text-cyan-700
                "
              >
                {record.poNumber}
              </td>
              <td className="px-5 py-4 text-slate-600">
                {formatThaiDate(
                  record.documentDate,
                )}
              </td>
              <td className="px-5 py-4 font-medium text-slate-800">
                {record.warehouse}
              </td>
              <td className="max-w-xs truncate px-5 py-4 text-slate-600">
                {record.fileName}
              </td>
              <td className="px-5 py-4 text-slate-500">
                {formatFileSize(
                  record.fileSize,
                )}
              </td>
              <td className="px-5 py-4">
                <div
                  className="
                    flex
                    justify-end
                    gap-2
                  "
                >
                  <button
                    type="button"
                    onClick={() => {
                      void onPreview(
                        record,
                      );
                    }}
                    disabled={
                      openingId ===
                      record.id
                    }
                    className="
                      rounded-lg
                      border
                      border-cyan-200
                      bg-cyan-50
                      px-3
                      py-2
                      text-xs
                      font-semibold
                      text-cyan-700
                      hover:bg-cyan-100
                      disabled:opacity-50
                    "
                  >
                    {openingId ===
                    record.id
                      ? "กำลังเปิด"
                      : "ดูไฟล์"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void openUrl(
                        record.fileUrl,
                      );
                    }}
                    className="
                      flex
                      items-center
                      gap-1.5
                      rounded-lg
                      bg-[#063b59]
                      px-3
                      py-2
                      text-xs
                      font-semibold
                      text-white
                      hover:bg-[#075071]
                    "
                  >
                    Drive
                    <ExternalLink
                      size={13}
                    />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({
  text,
  loading = false,
}: {
  text: string;
  loading?: boolean;
}) {
  return (
    <div
      className="
        flex
        min-h-64
        flex-col
        items-center
        justify-center
        gap-3
        text-sm
        text-slate-500
      "
    >
      {loading ? (
        <LoaderCircle
          className="animate-spin"
          size={28}
        />
      ) : (
        <FolderArchive size={34} />
      )}
      <p>{text}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-cyan-200
        bg-white/90
        p-5
        shadow-sm
      "
    >
      <div className="text-cyan-600">
        {icon}
      </div>
      <p className="mt-4 text-2xl font-semibold text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {label}
      </p>
    </div>
  );
}

function parseArchiveDate(
  value: string,
): ArchiveDate | null {
  const normalized =
    String(value || "").trim();

  const isoMatch =
    normalized.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})/,
    );

  const localMatch =
    normalized.match(
      /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/,
    );

  if (isoMatch) {
    return normalizeArchiveDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
  }

  if (localMatch) {
    return normalizeArchiveDate(
      Number(localMatch[3]),
      Number(localMatch[2]),
      Number(localMatch[1]),
    );
  }

  const parsed =
    new Date(normalized);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return null;
  }

  return {
    year:
      parsed.getFullYear(),
    month:
      parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
}

function normalizeArchiveDate(
  rawYear: number,
  month: number,
  day: number,
): ArchiveDate | null {
  const year =
    rawYear > 2400
      ? rawYear - 543
      : rawYear;

  if (
    year < 1900 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
}

function toBuddhistYear(
  year: number,
): number {
  return year > 2400
    ? year
    : year + 543;
}

function formatFileSize(
  bytes: number,
): string {
  const size =
    Number(bytes || 0);

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}

function formatThaiDate(
  value: string,
): string {
  const parsed =
    parseArchiveDate(value);

  if (!parsed) {
    return value || "-";
  }

  return `${parsed.day} ${
    thaiMonths[parsed.month]
  } ${toBuddhistYear(
    parsed.year,
  )}`;
}

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
