import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Folder,
  Globe2,
  LoaderCircle,
  RefreshCw,
  Save,
  Search,
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

interface WorldwideRetailPageProps {
  currentUser: AppUser;
  onBack: () => void;
  archiveOnly?: boolean;
}

interface ArchiveDate {
  year: number;
  month: number;
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
  const [
    respondingId,
    setRespondingId,
  ] = useState("");
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");
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
          : records;

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
      records,
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
      respondingId
    ) {
      return;
    }

    setRespondingId(
      record.id,
    );
    setError("");
    setSuccess("");

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
      setError(
        getErrorMessage(
          reason,
        ),
      );
    } finally {
      setRespondingId("");
    }
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

      {(error || success) && (
        <div
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

        <div className="border-b border-slate-100 p-6">
          <div className="flex flex-wrap gap-3">
            {yearFolders.map(
              ([year, items]) => (
                <FolderButton
                  key={year}
                  active={
                    selectedYear ===
                    year
                  }
                  label={`ปี ${
                    year + 543
                  }`}
                  count={
                    items.length
                  }
                  onClick={() => {
                    setSelectedYear(
                      year,
                    );
                    setSelectedMonth(
                      null,
                    );
                  }}
                />
              ),
            )}

            {!loading &&
              yearFolders.length ===
                0 && (
                <p className="text-sm text-slate-400">
                  ยังไม่มีแฟ้มข้อมูล
                </p>
              )}
          </div>

          {selectedYear !==
            null && (
            <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
              {monthFolders.map(
                ([
                  month,
                  items,
                ]) => (
                  <FolderButton
                    key={month}
                    active={
                      selectedMonth ===
                      month
                    }
                    label={
                      thaiMonths[
                        month
                      ]
                    }
                    count={
                      items.length
                    }
                    onClick={() => {
                      setSelectedMonth(
                        month,
                      );
                    }}
                  />
                ),
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full">
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
                <th className="px-5 py-4">
                  เอกสาร
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-16 text-center"
                  >
                    <LoaderCircle
                      size={28}
                      className="mx-auto animate-spin text-violet-600"
                    />
                    <p className="mt-3 text-sm text-slate-500">
                      กำลังโหลดแฟ้มข้อมูล
                    </p>
                  </td>
                </tr>
              ) : visibleRecords
                  .length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
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
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <DocumentButton
                            label="PO"
                            url={
                              record.poFileUrl
                            }
                          />
                          <DocumentButton
                            label="IV"
                            url={
                              record.ivFileUrl
                            }
                          />
                        </div>
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
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {canRespond ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  void respond(
                                    record,
                                    "received",
                                  );
                                }}
                                disabled={
                                  Boolean(
                                    respondingId,
                                  )
                                }
                                title="ยืนยันว่าได้รับแล้ว"
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                              >
                                {respondingId ===
                                record.id ? (
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
                                  Boolean(
                                    respondingId,
                                  )
                                }
                                title="แจ้งว่ายังไม่ได้รับหรือเอกสารมีปัญหา"
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
                              >
                                <X
                                  size={18}
                                />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">
                              รอสำนักงานใหญ่
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
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

interface FolderButtonProps {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}

function FolderButton({
  active,
  label,
  count,
  onClick,
}: FolderButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex
        items-center
        gap-2
        rounded-xl
        border
        px-4
        py-3
        text-sm
        font-semibold
        transition
        ${
          active
            ? "border-violet-500 bg-violet-600 text-white shadow-md shadow-violet-200"
            : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"
        }
      `}
    >
      <Folder
        size={17}
      />
      {label}
      <span
        className={`
          rounded-md
          px-1.5
          py-0.5
          text-[10px]
          ${
            active
              ? "bg-white/20"
              : "bg-slate-100 text-slate-500"
          }
        `}
      >
        {count}
      </span>
    </button>
  );
}

function DocumentButton({
  label,
  url,
}: {
  label: string;
  url: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (url) {
          void openUrl(url);
        }
      }}
      disabled={!url}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-40"
    >
      <FileText
        size={14}
      />
      {label}
      <ExternalLink
        size={12}
      />
    </button>
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
