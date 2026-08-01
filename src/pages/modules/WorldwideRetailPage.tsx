import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  ExternalLink,
  FolderOpen,
  Globe2,
  LoaderCircle,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import {
  openUrl,
} from "@tauri-apps/plugin-opener";

import type {
  AppUser,
} from "../../auth/auth.types";

import {
  worldwideRetailService,
} from "../../services/worldwideRetailService";

import type {
  SelectedWorldwidePdf,
  WorldwideAcknowledgementStatus,
  WorldwideRetailRecord,
} from "../../types/worldwideRetail.types";

import {
  base64ToPdfUrl,
} from "../../utils/fileEncoding";

interface WorldwideRetailPageProps {
  currentUser: AppUser;
  onBack: () => void;
  archiveOnly?: boolean;
}

interface ArchiveDate {
  year: number;
  month: number;
}

interface CachedPdfPreview {
  fileName: string;
  fileUrl: string;
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

export function WorldwideRetailPage({
  currentUser,
  onBack,
  archiveOnly = false,
}: WorldwideRetailPageProps) {
  const [records, setRecords] =
    useState<
      WorldwideRetailRecord[]
    >([]);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [deletingIds, setDeletingIds] =
    useState<string[]>([]);
  const [
    respondingIds,
    setRespondingIds,
  ] = useState<string[]>([]);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");
  const [openingDocument, setOpeningDocument] =
    useState("");
  const [previewOpen, setPreviewOpen] =
    useState(false);
  const [previewLoading, setPreviewLoading] =
    useState(false);
  const [previewError, setPreviewError] =
    useState("");
  const [previewUrl, setPreviewUrl] =
    useState("");
  const [previewName, setPreviewName] =
    useState("");
  const [previewDriveUrl, setPreviewDriveUrl] =
    useState("");
  const [previewType, setPreviewType] =
    useState<"po" | "iv">("po");
  const previewCacheRef =
    useRef(
      new Map<
        string,
        CachedPdfPreview
      >(),
    );
  const previewRequestsRef =
    useRef(
      new Map<
        string,
        Promise<CachedPdfPreview>
      >(),
    );
  const activePreviewKeyRef =
    useRef("");
  const [search, setSearch] =
    useState("");
  const [
    selectedYear,
    setSelectedYear,
  ] = useState<number | null>(
    null,
  );
  const [
    selectedMonth,
    setSelectedMonth,
  ] = useState<number | null>(
    null,
  );
  const [ivNumber, setIvNumber] =
    useState("");
  const [poNumber, setPoNumber] =
    useState("");
  const [soNumber, setSoNumber] =
    useState("");
  const [
    documentDate,
    setDocumentDate,
  ] = useState(
    getTodayInputValue(),
  );
  const [poFile, setPoFile] =
    useState<
      SelectedWorldwidePdf | null
    >(null);
  const [ivFile, setIvFile] =
    useState<
      SelectedWorldwidePdf | null
    >(null);

  const canRespond =
    currentUser.userCode
      .trim()
      .toUpperCase() ===
    "HEADOFFICE";

  const canDelete =
    currentUser.userCode
      .trim()
      .toUpperCase() ===
    "OFFICE";

  const operationActive =
    saving ||
    loading ||
    respondingIds.length > 0 ||
    deletingIds.length > 0;

  const operationLabel =
    saving
      ? "กำลังบันทึกเอกสารไป Google Drive"
      : respondingIds.length > 0
        ? "กำลังบันทึกสถานะตอบรับ"
        : deletingIds.length > 0
          ? "กำลังลบข้อมูลและย้ายไฟล์"
          : loading
            ? "กำลังโหลดแฟ้มข้อมูล"
            : "ดำเนินการเสร็จสิ้น";

  const operationProgress =
    useAnimatedProgress(
      operationActive,
    );

  const loadRecords =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const nextRecords =
          await worldwideRetailService
            .list();

        setRecords(
          Array.isArray(
            nextRecords,
          )
            ? nextRecords
            : [],
        );
      } catch (reason) {
        setError(
          getErrorMessage(
            reason,
          ),
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setSuccess("");
        },
        4000,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [success]);

  useEffect(
    () => () => {
      previewCacheRef.current
        .forEach((preview) => {
          URL.revokeObjectURL(
            preview.fileUrl,
          );
        });
      previewCacheRef.current
        .clear();
      previewRequestsRef.current
        .clear();
    },
    [],
  );

  const datedRecords =
    useMemo(
      () =>
        records
          .map((record) => ({
            record,
            date:
              parseArchiveDate(
                record.documentDate,
              ),
          }))
          .filter(
            (
              item,
            ): item is {
              record:
                WorldwideRetailRecord;
              date: ArchiveDate;
            } => Boolean(
              item.date,
            ),
          ),
      [records],
    );

  const yearFolders =
    useMemo(() => {
      const groups =
        new Map<
          number,
          WorldwideRetailRecord[]
        >();

      datedRecords.forEach(
        ({ record, date }) => {
          const items =
            groups.get(
              date.year,
            ) ?? [];

          items.push(record);
          groups.set(
            date.year,
            items,
          );
        },
      );

      return Array.from(
        groups.entries(),
      ).sort(
        ([first], [second]) =>
          second - first,
      );
    }, [datedRecords]);

  const monthFolders =
    useMemo(() => {
      if (
        selectedYear === null
      ) {
        return [];
      }

      const groups =
        new Map<
          number,
          WorldwideRetailRecord[]
        >();

      datedRecords
        .filter(
          ({ date }) =>
            date.year ===
            selectedYear,
        )
        .forEach(
          ({ record, date }) => {
            const items =
              groups.get(
                date.month,
              ) ?? [];

            items.push(record);
            groups.set(
              date.month,
              items,
            );
          },
        );

      return Array.from(
        groups.entries(),
      ).sort(
        ([first], [second]) =>
          second - first,
      );
    }, [
      datedRecords,
      selectedYear,
    ]);

  const visibleRecords =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      const source =
        selectedYear !== null &&
        selectedMonth !== null
          ? datedRecords
              .filter(
                ({ date }) =>
                  date.year ===
                    selectedYear &&
                  date.month ===
                    selectedMonth,
              )
              .map(
                ({ record }) =>
                  record,
              )
          : [];

      return source
        .filter((record) => {
          if (!keyword) {
            return true;
          }

          return [
            record.ivNumber,
            record.poNumber,
            record.soNumber,
            record.documentDate,
            record.uploadedBy,
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(
                keyword,
              ),
          );
        })
        .sort((first, second) =>
          second.documentDate
            .localeCompare(
              first.documentDate,
            ),
        );
    }, [
      datedRecords,
      search,
      selectedMonth,
      selectedYear,
    ]);

  const selectPdf = async (
    target: "po" | "iv",
  ) => {
    setError("");

    try {
      const selected =
        await worldwideRetailService
          .selectPdf();

      if (!selected) {
        return;
      }

      if (target === "po") {
        setPoFile(selected);
      } else {
        setIvFile(selected);
      }
    } catch (reason) {
      setError(
        getErrorMessage(
          reason,
        ),
      );
    }
  };

  const saveRecord =
    async () => {
      if (saving) {
        return;
      }

      if (
        !ivNumber.trim() ||
        !poNumber.trim() ||
        !soNumber.trim() ||
        !documentDate ||
        !poFile ||
        !ivFile
      ) {
        setError(
          "กรุณากรอก IV, PO, SO, วันที่ และอัปโหลด PDF ทั้งสองไฟล์ให้ครบ",
        );
        return;
      }

      setSaving(true);
      setError("");
      setSuccess("");

      try {
        const [
          poPdf,
          ivPdf,
        ] = await Promise.all([
          worldwideRetailService
            .readPdf(
              poFile.path,
            ),
          worldwideRetailService
            .readPdf(
              ivFile.path,
            ),
        ]);

        await worldwideRetailService
          .upload({
            ivNumber:
              ivNumber.trim(),
            poNumber:
              poNumber.trim(),
            soNumber:
              soNumber.trim(),
            documentDate:
              toThaiDateValue(
                documentDate,
              ),
            poFile: {
              fileName:
                poPdf.fileName,
              base64Data:
                poPdf.base64Data,
            },
            ivFile: {
              fileName:
                ivPdf.fileName,
              base64Data:
                ivPdf.base64Data,
            },
          });

        setIvNumber("");
        setPoNumber("");
        setSoNumber("");
        setPoFile(null);
        setIvFile(null);
        setSuccess(
          "บันทึกข้อมูลและไฟล์ PDF ลงแฟ้ม Google Drive สำเร็จ",
        );

        await loadRecords();
      } catch (reason) {
        setError(
          getErrorMessage(
            reason,
          ),
        );
      } finally {
        setSaving(false);
      }
    };

  const respond = async (
    record:
      WorldwideRetailRecord,
    status:
      | "received"
      | "rejected",
  ) => {
    if (
      !canRespond ||
      respondingIds.includes(
        record.id,
      )
    ) {
      return;
    }

    const previousRecord =
      record;

    const optimisticRecord = {
      ...record,
      acknowledgementStatus:
        status,
      acknowledgedAt:
        new Date().toISOString(),
      acknowledgedBy:
        currentUser.userCode,
    };

    setRespondingIds(
      (current) => [
        ...current,
        record.id,
      ],
    );
    setError("");
    setSuccess("");
    setRecords((current) =>
      current.map((item) =>
        item.id === record.id
          ? optimisticRecord
          : item,
      ),
    );

    try {
      const updated =
        await worldwideRetailService
          .acknowledge(
            record.id,
            status,
          );

      setRecords(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              updated.id
                ? updated
                : item,
          ),
      );

      setSuccess(
        status ===
          "received"
          ? "ยืนยันว่าได้รับเอกสารแล้ว"
          : "แจ้งว่ายังไม่ได้รับหรือเอกสารมีปัญหาแล้ว",
      );
    } catch (reason) {
      setRecords((current) =>
        current.map((item) =>
          item.id === record.id
            ? previousRecord
            : item,
        ),
      );
      setError(
        getErrorMessage(
          reason,
        ),
      );
    } finally {
      setRespondingIds(
        (current) =>
          current.filter(
            (id) =>
              id !== record.id,
          ),
      );
    }
  };

  const deleteRecord = async (
    record:
      WorldwideRetailRecord,
  ) => {
    if (
      !canDelete ||
      deletingIds.includes(
        record.id,
      )
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        [
          "ยืนยันลบรายการนี้หรือไม่?",
          "",
          `IV: ${record.ivNumber || "-"}`,
          `PO: ${record.poNumber || "-"}`,
          `SO: ${record.soNumber || "-"}`,
          "",
          "ข้อมูลจะหายจากหน้าระบบ และไฟล์ PO/IV จะถูกย้ายไปถังขยะของ Google Drive",
        ].join("\n"),
      );

    if (!confirmed) {
      return;
    }

    setDeletingIds(
      (current) => [
        ...current,
        record.id,
      ],
    );
    setError("");
    setSuccess("");

    try {
      const deleted =
        await worldwideRetailService
          .delete(
            record.id,
          );

      setRecords(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              deleted.id,
          ),
      );

      (["po", "iv"] as const)
        .forEach(
          (documentType) => {
            const cacheKey =
              `${record.id}:${documentType}`;
            const cached =
              previewCacheRef.current
                .get(cacheKey);

            if (cached) {
              URL.revokeObjectURL(
                cached.fileUrl,
              );
              previewCacheRef.current
                .delete(cacheKey);
            }
          },
        );

      setSuccess(
        `ลบรายการ ${record.ivNumber || record.poNumber} และย้ายไฟล์ ${deleted.trashedFileCount.toLocaleString()} ไฟล์ไปถังขยะ Google Drive แล้ว`,
      );
    } catch (reason) {
      setError(
        getErrorMessage(
          reason,
        ),
      );
    } finally {
      setDeletingIds(
        (current) =>
          current.filter(
            (id) =>
              id !== record.id,
          ),
      );
    }
  };

  const loadPreview = (
    record: WorldwideRetailRecord,
    documentType: "po" | "iv",
  ): Promise<CachedPdfPreview> => {
    const cacheKey =
      `${record.id}:${documentType}`;
    const cached =
      previewCacheRef.current
        .get(cacheKey);

    if (cached) {
      return Promise.resolve(
        cached,
      );
    }

    const pending =
      previewRequestsRef.current
        .get(cacheKey);

    if (pending) {
      return pending;
    }

    const request =
      worldwideRetailService
        .getPdf(
          record.id,
          documentType,
        )
        .then((pdf) => {
          const loaded = {
            fileName:
              pdf.fileName,
            fileUrl:
              base64ToPdfUrl(
                pdf.base64Data,
              ),
          };

          previewCacheRef.current
            .set(
              cacheKey,
              loaded,
            );
          previewRequestsRef.current
            .delete(cacheKey);

          return loaded;
        })
        .catch((reason) => {
          previewRequestsRef.current
            .delete(cacheKey);
          throw reason;
        });

    previewRequestsRef.current
      .set(
        cacheKey,
        request,
      );

    return request;
  };

  const prefetchPreview = (
    record: WorldwideRetailRecord,
    documentType: "po" | "iv",
  ) => {
    const cacheKey =
      `${record.id}:${documentType}`;

    if (
      previewCacheRef.current
        .has(cacheKey) ||
      previewRequestsRef.current
        .has(cacheKey)
    ) {
      return;
    }

    void loadPreview(
      record,
      documentType,
    ).catch(() => {
      // Prefetch is best-effort; a click will retry and show the error.
    });
  };

  const openPreview = async (
    record: WorldwideRetailRecord,
    documentType: "po" | "iv",
  ) => {
    const openingKey =
      `${record.id}:${documentType}`;

    activePreviewKeyRef.current =
      openingKey;
    setOpeningDocument(
      openingKey,
    );
    setPreviewType(
      documentType,
    );
    setPreviewDriveUrl(
      documentType === "po"
        ? record.poFileUrl
        : record.ivFileUrl,
    );
    setPreviewName(
      documentType === "po"
        ? record.poFileName
        : record.ivFileName,
    );
    setPreviewUrl("");
    setPreviewError("");
    setPreviewLoading(true);
    setPreviewOpen(true);
    setError("");

    try {
      const preview =
        await loadPreview(
          record,
          documentType,
        );

      if (
        activePreviewKeyRef.current !==
        openingKey
      ) {
        return;
      }

      setPreviewUrl(
        preview.fileUrl,
      );
      setPreviewName(
        preview.fileName,
      );
    } catch (reason) {
      if (
        activePreviewKeyRef.current ===
        openingKey
      ) {
        setPreviewError(
          getErrorMessage(
            reason,
          ),
        );
      }
    } finally {
      if (
        activePreviewKeyRef.current ===
        openingKey
      ) {
        setPreviewLoading(false);
        setOpeningDocument("");
      }
    }
  };

  const closePreview = () => {
    activePreviewKeyRef.current =
      "";
    setPreviewOpen(false);
    setPreviewLoading(false);
    setPreviewError("");
    setOpeningDocument("");
    setPreviewUrl("");
    setPreviewName("");
    setPreviewDriveUrl("");
  };

  return (
    <div
      className="
        vp-work-page
        mx-auto
        max-w-[1500px]
        px-6
        py-8
        lg:px-10
      "
    >
      <header className="vp-page-header flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-5 flex items-center gap-2 text-sm text-slate-500 transition hover:text-violet-700"
          >
            <ArrowLeft
              size={17}
            />
            {archiveOnly
              ? "กลับศูนย์แฟ้มบันทึกข้อมูล"
              : "กลับหน้าแดชบอร์ด"}
          </button>

          <p className="text-[10px] font-semibold tracking-[0.24em] text-violet-700">
            RETAIL WORLDWIDE
          </p>

          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            {archiveOnly
              ? "แฟ้มข้อมูล รีเทลขายเวิร์ลไวด์"
              : "ลงยอด PO รีเทล ขายเวิร์ลไวด์"}
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            จัดเก็บเลข IV, PO, SO และไฟล์เอกสารบน Google Drive
            แยกตามปีและเดือน พร้อมติดตามการตอบรับจากสำนักงานใหญ่
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700 shadow-sm">
          <Globe2
            size={23}
          />
        </div>
      </header>

      {!archiveOnly && (
        <section className="mt-8 rounded-3xl border border-violet-200 bg-white p-6 shadow-[0_18px_45px_rgba(76,29,149,0.08)] lg:p-8">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Field
              label="เลข IV"
              value={ivNumber}
              placeholder="เช่น IV6907001"
              onChange={
                setIvNumber
              }
            />

            <Field
              label="เลข PO"
              value={poNumber}
              placeholder="เช่น B012701689"
              onChange={
                setPoNumber
              }
            />

            <Field
              label="เลข SO"
              value={soNumber}
              placeholder="กรอกเลข SO"
              onChange={
                setSoNumber
              }
            />

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">
                วันที่เอกสาร
              </span>
              <input
                type="date"
                value={
                  documentDate
                }
                onChange={(
                  event,
                ) => {
                  setDocumentDate(
                    event.target
                      .value,
                  );
                }}
                className="mt-2.5 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <PdfUploadCard
              title="อัปโหลด PO"
              description="เลือกไฟล์ PO ชนิด PDF"
              file={poFile}
              onSelect={() => {
                void selectPdf(
                  "po",
                );
              }}
              onClear={() => {
                setPoFile(null);
              }}
            />

            <PdfUploadCard
              title="อัปโหลด IV"
              description="เลือกไฟล์ IV ชนิด PDF"
              file={ivFile}
              onSelect={() => {
                void selectPdf(
                  "iv",
                );
              }}
              onClear={() => {
                setIvFile(null);
              }}
            />
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIvNumber("");
                setPoNumber("");
                setSoNumber("");
                setDocumentDate(
                  getTodayInputValue(),
                );
                setPoFile(null);
                setIvFile(null);
                setError("");
                setSuccess("");
              }}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              ล้างข้อมูล
            </button>

            <button
              type="button"
              onClick={() => {
                void saveRecord();
              }}
              disabled={saving}
              className="inline-flex min-w-48 items-center justify-center gap-2 rounded-xl bg-violet-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-800 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Save
                  size={18}
                />
              )}
              {saving
                ? "กำลังบันทึก..."
                : "บันทึกลงแฟ้ม"}
            </button>
          </div>
        </section>
      )}

      <OperationProgress
        progress={
          operationProgress
        }
        label={operationLabel}
      />

      {(error || success) && (
        <div
          role="status"
          aria-live="polite"
          className={`
            mt-6
            rounded-2xl
            border
            px-5
            py-4
            text-sm
            ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }
          `}
        >
          {error || success}
        </div>
      )}

      <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-violet-700">
              GOOGLE DRIVE ARCHIVE
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              แฟ้มปี / เดือน / รายการ
            </h3>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(
                  event,
                ) => {
                  setSearch(
                    event.target
                      .value,
                  );
                }}
                placeholder="ค้นหา IV / PO / SO"
                disabled={
                  selectedYear === null ||
                  selectedMonth === null
                }
                className="h-11 w-64 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-violet-300 focus:bg-white"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                void loadRecords();
              }}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />
              รีเฟรช
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => {
                setSelectedYear(null);
                setSelectedMonth(null);
                setSearch("");
              }}
              className={
                selectedYear === null
                  ? "font-semibold text-violet-700"
                  : "text-slate-500 transition hover:text-violet-700"
              }
            >
              แฟ้มปี
            </button>

            {selectedYear !== null && (
              <>
                <ChevronRight
                  size={15}
                  className="text-slate-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth(null);
                    setSearch("");
                  }}
                  className={
                    selectedMonth === null
                      ? "font-semibold text-violet-700"
                      : "text-slate-500 transition hover:text-violet-700"
                  }
                >
                  ปี {selectedYear + 543}
                </button>
              </>
            )}

            {selectedMonth !== null && (
              <>
                <ChevronRight
                  size={15}
                  className="text-slate-300"
                />
                <span className="font-semibold text-violet-700">
                  {thaiMonths[selectedMonth]}
                </span>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-16 text-center">
            <LoaderCircle
              size={28}
              className="mx-auto animate-spin text-violet-600"
            />
            <p className="mt-3 text-sm text-slate-500">
              กำลังโหลดแฟ้มข้อมูล
            </p>
          </div>
        ) : selectedYear === null ? (
          <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
            {yearFolders.map(
              ([year, items]) => (
                <FolderNavigationCard
                  key={year}
                  eyebrow="YEAR ARCHIVE"
                  label={`แฟ้มปี ${year + 543}`}
                  count={items.length}
                  tone="year"
                  onClick={() => {
                    setSelectedYear(year);
                    setSelectedMonth(null);
                  }}
                />
              ),
            )}

            {yearFolders.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm text-slate-400">
                ยังไม่มีแฟ้มข้อมูล
              </p>
            )}
          </div>
        ) : selectedMonth === null ? (
          <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
            {monthFolders.map(
              ([month, items]) => (
                <FolderNavigationCard
                  key={month}
                  eyebrow={`ปี ${selectedYear + 543}`}
                  label={`แฟ้มเดือน ${thaiMonths[month]}`}
                  count={items.length}
                  tone="month"
                  onClick={() => {
                    setSelectedMonth(month);
                  }}
                />
              ),
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-[1280px] w-full">
            <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-5 py-4">
                  วันที่
                </th>
                <th className="px-5 py-4">
                  IV
                </th>
                <th className="px-5 py-4">
                  PO
                </th>
                <th className="px-5 py-4">
                  SO
                </th>
                <th className="bg-sky-50/70 px-4 py-4 text-sky-800">
                  เอกสาร PO
                </th>
                <th className="bg-violet-50/70 px-4 py-4 text-violet-800">
                  เอกสาร IV
                </th>
                <th className="px-5 py-4">
                  ผู้บันทึก
                </th>
                <th className="px-5 py-4">
                  สถานะตอบรับ
                </th>
                <th className="px-5 py-4 text-right">
                  การตอบรับ
                </th>
                {canDelete && (
                  <th className="px-5 py-4 text-right text-red-700">
                    จัดการ
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={canDelete ? 10 : 9}
                    className="px-5 py-16 text-center text-sm text-slate-400"
                  >
                    ไม่พบรายการในแฟ้มที่เลือก
                  </td>
                </tr>
              ) : (
                visibleRecords.map(
                  (record) => (
                    <tr
                      key={record.id}
                      className="text-sm text-slate-700 transition hover:bg-violet-50/40"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        {formatThaiDate(
                          record.documentDate,
                        )}
                      </td>
                      <td className="px-5 py-4 font-semibold text-violet-700">
                        {record.ivNumber}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {record.poNumber}
                      </td>
                      <td className="px-5 py-4">
                        {record.soNumber}
                      </td>
                      <td className="bg-sky-50/30 px-4 py-3">
                        <DocumentActions
                          documentType="po"
                          fileName={record.poFileName}
                          driveUrl={record.poFileUrl}
                          loading={
                            openingDocument ===
                            `${record.id}:po`
                          }
                          onPreview={() => {
                            void openPreview(
                              record,
                              "po",
                            );
                          }}
                          onPrefetch={() => {
                            prefetchPreview(
                              record,
                              "po",
                            );
                          }}
                        />
                      </td>
                      <td className="bg-violet-50/30 px-4 py-3">
                        <DocumentActions
                          documentType="iv"
                          fileName={record.ivFileName}
                          driveUrl={record.ivFileUrl}
                          loading={
                            openingDocument ===
                            `${record.id}:iv`
                          }
                          onPreview={() => {
                            void openPreview(
                              record,
                              "iv",
                            );
                          }}
                          onPrefetch={() => {
                            prefetchPreview(
                              record,
                              "iv",
                            );
                          }}
                        />
                      </td>
                      <td className="px-5 py-4">
                        {record.uploadedBy ||
                          "-"}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            record.acknowledgementStatus
                          }
                        />
                        {record.acknowledgedBy && (
                          <p className="mt-2 text-[11px] text-slate-400">
                            โดย {record.acknowledgedBy}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {canRespond ? (
                            <div className="text-right">
                              <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  void respond(
                                    record,
                                    "received",
                                  );
                                }}
                                disabled={
                                  respondingIds.includes(
                                    record.id,
                                  )
                                }
                                title="ยืนยันว่าได้รับแล้ว"
                                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition hover:bg-emerald-600 hover:text-white disabled:opacity-50 ${
                                  record.acknowledgementStatus === "received"
                                    ? "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-100"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {respondingIds.includes(
                                  record.id,
                                ) ? (
                                  <LoaderCircle
                                    size={17}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Check
                                    size={18}
                                  />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  void respond(
                                    record,
                                    "rejected",
                                  );
                                }}
                                disabled={
                                  respondingIds.includes(
                                    record.id,
                                  )
                                }
                                title="แจ้งว่ายังไม่ได้รับหรือเอกสารมีปัญหา"
                                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition hover:bg-red-600 hover:text-white disabled:opacity-50 ${
                                  record.acknowledgementStatus === "rejected"
                                    ? "border-red-600 bg-red-600 text-white shadow-md shadow-red-100"
                                    : "border-red-200 bg-red-50 text-red-700"
                                }`}
                              >
                                <X
                                  size={18}
                                />
                              </button>
                              </div>
                              <p className="mt-1.5 text-[10px] text-slate-400">
                                กดเปลี่ยนสถานะได้
                              </p>
                            </div>
                          ) : (
                            <AcknowledgementSummary
                              status={record.acknowledgementStatus}
                            />
                          )}
                        </div>
                      </td>
                      {canDelete && (
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              void deleteRecord(
                                record,
                              );
                            }}
                            disabled={
                              deletingIds.includes(
                                record.id,
                              )
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-wait disabled:opacity-50"
                            title="ลบข้อมูลและไฟล์บน Google Drive"
                          >
                            {deletingIds.includes(
                              record.id,
                            ) ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2
                                size={16}
                              />
                            )}
                            {deletingIds.includes(
                              record.id,
                            )
                              ? "กำลังลบ"
                              : "ลบ"}
                          </button>
                        </td>
                      )}
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
        )}
      </section>

      {previewOpen && (
        <PdfPreviewModal
          fileName={previewName}
          fileUrl={previewUrl}
          loading={previewLoading}
          error={previewError}
          documentType={previewType}
          onDrive={() => {
            if (previewDriveUrl) {
              void openUrl(
                previewDriveUrl,
              );
            }
          }}
          onClose={closePreview}
        />
      )}
    </div>
  );
}

function useAnimatedProgress(
  active: boolean,
) {
  const [progress, setProgress] =
    useState(0);
  const wasActiveRef =
    useRef(false);

  useEffect(() => {
    let progressTimer:
      | number
      | undefined;
    let resetTimer:
      | number
      | undefined;

    if (active) {
      wasActiveRef.current =
        true;
      setProgress((current) =>
        current <= 0 ||
        current >= 100
          ? 8
          : current,
      );

      progressTimer =
        window.setInterval(
          () => {
            setProgress(
              (current) => {
                if (
                  current >= 92
                ) {
                  return 92;
                }

                const step =
                  Math.max(
                    1,
                    Math.ceil(
                      (92 -
                        current) *
                        0.09,
                    ),
                  );

                return Math.min(
                  92,
                  current + step,
                );
              },
            );
          },
          180,
        );
    } else if (
      wasActiveRef.current
    ) {
      wasActiveRef.current =
        false;
      setProgress(100);
      resetTimer =
        window.setTimeout(
          () => {
            setProgress(0);
          },
          650,
        );
    }

    return () => {
      if (
        progressTimer !==
        undefined
      ) {
        window.clearInterval(
          progressTimer,
        );
      }

      if (
        resetTimer !== undefined
      ) {
        window.clearTimeout(
          resetTimer,
        );
      }
    };
  }, [active]);

  return progress;
}

function OperationProgress({
  progress,
  label,
}: {
  progress: number;
  label: string;
}) {
  if (progress <= 0) {
    return null;
  }

  return (
    <div
      className="mt-6 rounded-2xl border border-cyan-200 bg-white px-5 py-4 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        {progress < 100 ? (
          <LoaderCircle
            size={19}
            className="shrink-0 animate-spin text-cyan-700"
          />
        ) : (
          <CheckCircle2
            size={19}
            className="shrink-0 text-emerald-600"
          />
        )}

        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
          {label}
        </p>

        <span className="text-lg font-semibold tabular-nums text-cyan-700">
          {Math.round(
            progress,
          )}
          %
        </span>
      </div>

      <ProgressBar
        progress={progress}
        className="mt-3"
        tone={
          progress >= 100
            ? "emerald"
            : "cyan"
        }
      />
    </div>
  );
}

function ProgressBar({
  progress,
  className = "",
  tone,
}: {
  progress: number;
  className?: string;
  tone:
    | "cyan"
    | "emerald"
    | "sky"
    | "violet";
}) {
  const toneClass = {
    cyan:
      "from-cyan-500 to-blue-600",
    emerald:
      "from-emerald-400 to-emerald-600",
    sky:
      "from-sky-400 to-blue-600",
    violet:
      "from-violet-400 to-violet-700",
  }[tone];

  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={
        Math.round(progress)
      }
    >
      <div
        className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-200 ease-out ${toneClass}`}
        style={{
          width: `${Math.max(
            0,
            Math.min(
              100,
              progress,
            ),
          )}%`,
        }}
      />
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (
    value: string,
  ) => void;
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: FieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => {
          onChange(
            event.target.value,
          );
        }}
        placeholder={placeholder}
        className="mt-2.5 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

interface PdfUploadCardProps {
  title: string;
  description: string;
  file:
    | SelectedWorldwidePdf
    | null;
  onSelect: () => void;
  onClear: () => void;
}

function PdfUploadCard({
  title,
  description,
  file,
  onSelect,
  onClear,
}: PdfUploadCardProps) {
  return (
    <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm">
          {file ? (
            <CheckCircle2
              size={21}
            />
          ) : (
            <Upload
              size={21}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">
            {title}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {file
              ? file.fileName
              : description}
          </p>
        </div>

        {file && (
          <button
            type="button"
            onClick={onClear}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            title="ล้างไฟล์"
          >
            <X
              size={16}
            />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onSelect}
        className="mt-5 w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-50"
      >
        {file
          ? "เปลี่ยนไฟล์ PDF"
          : "เลือกไฟล์ PDF"}
      </button>
    </div>
  );
}

interface FolderNavigationCardProps {
  eyebrow: string;
  label: string;
  count: number;
  tone: "year" | "month";
  onClick: () => void;
}

function FolderNavigationCard({
  eyebrow,
  label,
  count,
  tone,
  onClick,
}: FolderNavigationCardProps) {
  const yearTone =
    tone === "year";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        vp-archive-folder
        group
        flex
        min-h-24
        items-center
        justify-between
        gap-4
        rounded-2xl
        border
        p-4
        text-left
        transition
        hover:-translate-y-0.5
        bg-white
        shadow-sm
        hover:shadow-md
        ${yearTone
          ? "border-sky-200 hover:border-sky-400 hover:shadow-sky-100"
          : "border-violet-200 hover:border-violet-400 hover:shadow-violet-100"}
      `}
    >
      <div className="flex items-center gap-4">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            yearTone
              ? "bg-sky-600 text-white"
              : "bg-violet-600 text-white"
          }`}
        >
          <FolderOpen size={23} />
        </span>

        <span>
          <span
            className={`block text-[10px] font-semibold tracking-[0.18em] ${
              yearTone
                ? "text-sky-700"
                : "text-violet-700"
            }`}
          >
            {eyebrow}
          </span>
          <span className="mt-1.5 block font-semibold text-slate-900">
            {label}
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            {count} รายการ
          </span>
        </span>
      </div>

      <ChevronRight
        size={20}
        className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600"
      />
    </button>
  );
}

function DocumentActions({
  documentType,
  fileName,
  driveUrl,
  loading,
  onPreview,
  onPrefetch,
}: {
  documentType: "po" | "iv";
  fileName: string;
  driveUrl: string;
  loading: boolean;
  onPreview: () => void;
  onPrefetch: () => void;
}) {
  const isPo =
    documentType === "po";

  return (
    <div className="vp-document-actions min-w-[150px]">
      <p
        className="max-w-[170px] truncate text-[10px] text-slate-500"
        title={fileName}
      >
        {fileName || "PDF"}
      </p>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onPreview}
          onMouseEnter={onPrefetch}
          onFocus={onPrefetch}
          disabled={loading}
          className={`inline-flex h-8 items-center justify-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold text-white transition disabled:opacity-60 ${
            isPo
              ? "bg-sky-600 hover:bg-sky-700"
              : "bg-violet-600 hover:bg-violet-700"
          }`}
        >
          {loading ? (
            <LoaderCircle
              size={13}
              className="animate-spin"
            />
          ) : (
            <Eye size={13} />
          )}
          View
        </button>

        <button
          type="button"
          onClick={() => {
            if (driveUrl) {
              void openUrl(
                driveUrl,
              );
            }
          }}
          disabled={!driveUrl}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-40"
        >
          <ExternalLink size={13} />
          Drive
        </button>
      </div>
    </div>
  );
}

function AcknowledgementSummary({
  status,
}: {
  status:
    WorldwideAcknowledgementStatus;
}) {
  if (status === "received") {
    return (
      <span className="text-xs font-semibold text-emerald-700">
        สำนักงานใหญ่รับแล้ว
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="text-xs font-semibold text-red-700">
        สำนักงานใหญ่แจ้งแก้ไข
      </span>
    );
  }

  return (
    <span className="text-xs text-amber-600">
      รอสำนักงานใหญ่
    </span>
  );
}

function PdfPreviewModal({
  fileName,
  fileUrl,
  loading,
  error,
  documentType,
  onDrive,
  onClose,
}: {
  fileName: string;
  fileUrl: string;
  loading: boolean;
  error: string;
  documentType: "po" | "iv";
  onDrive: () => void;
  onClose: () => void;
}) {
  const isPo =
    documentType === "po";
  const loadingProgress =
    useAnimatedProgress(
      loading,
    );

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
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview เอกสาร ${documentType.toUpperCase()}`}
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="flex h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[calc(100vh-2.5rem)] sm:rounded-3xl">
        <header
          className={`relative z-10 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 sm:py-4 ${
            isPo
              ? "border-sky-200 bg-sky-50"
              : "border-violet-200 bg-violet-50"
          }`}
        >
          <div className="min-w-0">
            <p
              className={`text-[10px] font-bold tracking-[0.2em] ${
                isPo
                  ? "text-sky-700"
                  : "text-violet-700"
              }`}
            >
              เอกสาร {documentType.toUpperCase()} · PREVIEW
            </p>
            <p className="mt-1 truncate font-semibold text-slate-900">
              {fileName}
            </p>
          </div>

          <div className="flex shrink-0 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onDrive}
              className={`hidden h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition sm:inline-flex ${
                isPo
                  ? "bg-sky-600 hover:bg-sky-700"
                  : "bg-violet-600 hover:bg-violet-700"
              }`}
            >
              <ExternalLink size={16} />
              เปิด Drive
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 sm:px-4"
              title="ปิด Preview"
            >
              <X size={19} />
              <span>ปิด</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-slate-100 px-6 text-slate-600">
            <LoaderCircle
              size={34}
              className={`animate-spin ${
                isPo
                  ? "text-sky-600"
                  : "text-violet-600"
              }`}
            />
            <div className="mt-4 flex w-full max-w-md items-center justify-between gap-4">
              <p className="text-sm font-semibold">
                กำลังเตรียมเอกสาร Preview
              </p>
              <span className="text-xl font-semibold tabular-nums text-slate-800">
                {Math.round(
                  loadingProgress,
                )}
                %
              </span>
            </div>
            <ProgressBar
              progress={
                loadingProgress
              }
              className="mt-3 max-w-md"
              tone={
                isPo
                  ? "sky"
                  : "violet"
              }
            />
          </div>
        ) : error ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-red-50 px-6 text-center">
            <XCircle
              size={36}
              className="text-red-500"
            />
            <div>
              <p className="font-semibold text-red-800">
                เปิด Preview ไม่สำเร็จ
              </p>
              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={onDrive}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-red-200"
            >
              <ExternalLink size={16} />
              เปิดจาก Drive
            </button>
          </div>
        ) : (
          <iframe
            title={fileName}
            src={fileUrl}
            className="min-h-0 flex-1 border-0 bg-slate-100"
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

function StatusBadge({
  status,
}: {
  status:
    WorldwideAcknowledgementStatus;
}) {
  if (status === "received") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2
          size={14}
        />
        ได้รับแล้ว
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
        <XCircle
          size={14}
        />
        ยังไม่ได้รับ
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
      รอตอบรับ
    </span>
  );
}

function parseArchiveDate(
  value: string,
): ArchiveDate | null {
  const match =
    String(value || "")
      .trim()
      .match(
        /^(\d{4})-(\d{2})-(\d{2})$/,
      );

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
  };
}

function formatThaiDate(
  value: string,
) {
  const match =
    String(value || "")
      .match(
        /^(\d{4})-(\d{2})-(\d{2})$/,
      );

  if (!match) {
    return value || "-";
  }

  return `${Number(
    match[3],
  )}/${Number(
    match[2],
  )}/${Number(
    match[1],
  ) + 543}`;
}

function toThaiDateValue(
  value: string,
) {
  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
    );

  if (!match) {
    throw new Error(
      "วันที่เอกสารไม่ถูกต้อง",
    );
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function getTodayInputValue() {
  const now =
    new Date();

  const year =
    now.getFullYear();
  const month =
    String(
      now.getMonth() + 1,
    ).padStart(2, "0");
  const day =
    String(
      now.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getErrorMessage(
  reason: unknown,
) {
  if (
    reason instanceof Error
  ) {
    return reason.message;
  }

  return String(reason);
}
