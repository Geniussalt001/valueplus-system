import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Archive,
  ExternalLink,
  FileText,
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

import type {
  AppUser,
} from "../../../auth/auth.types";

import {
  poArchiveService,
} from "../../../services/poArchiveService";

import type {
  PoArchiveRecord,
} from "../../../types/poArchive.types";

import {
  base64ToPdfUrl,
} from "../../../utils/fileEncoding";

interface PoDataPageProps {
  currentUser: AppUser;
  onBack: () => void;
}

export function PoDataPage({
  currentUser,
  onBack,
}: PoDataPageProps) {
  const [records, setRecords] =
    useState<PoArchiveRecord[]>([]);
  const [search, setSearch] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [previewUrl, setPreviewUrl] =
    useState("");
  const [previewName, setPreviewName] =
    useState("");
  const [openingId, setOpeningId] =
    useState("");

  const loadRecords =
    useCallback(async () => {
      setLoading(true);
      setError("");

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
            .includes(keyword),
      );
    }, [records, search]);

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

    try {
      const pdf =
        await poArchiveService
          .getPdf(record.id);

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
      <header
        className="
          flex
          flex-col
          justify-between
          gap-5
          md:flex-row
          md:items-end
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
              hover:text-cyan-600
            "
          >
            <ArrowLeft size={17} />
            กลับหน้าแดชบอร์ด
          </button>

          <p
            className="
              text-[10px]
              font-semibold
              tracking-[0.24em]
              text-cyan-600
            "
          >
            PO DOCUMENT ARCHIVE
          </p>

          <h2
            className="
              mt-2
              text-3xl
              font-semibold
              text-slate-900
            "
          >
            แฟ้มบันทึกข้อมูล
          </h2>

          <p
            className="
              mt-3
              max-w-3xl
              text-sm
              leading-6
              text-slate-500
            "
          >
            เอกสารที่แยกและเปลี่ยนชื่อแล้วจะถูกจัดเก็บใน
            Google Drive อัตโนมัติ เพื่อให้สำนักงานใหญ่ค้นหาและเปิดใช้งานได้
          </p>
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
          <FolderArchive size={23} />
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
          label="เอกสารทั้งหมด"
          value={records.length}
          icon={<Archive size={18} />}
        />
        <StatCard
          label="คลังที่พบ"
          value={warehouseCount}
          icon={<Warehouse size={18} />}
        />
        <StatCard
          label="พื้นที่เอกสาร"
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
            placeholder="ค้นหาเลข PO, คลัง, วันที่ หรือชื่อไฟล์"
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
          โหลดข้อมูลใหม่
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
            items-center
            justify-between
            border-b
            border-slate-200
            px-5
            py-4
          "
        >
          <div>
            <h3
              className="
                font-semibold
                text-slate-900
              "
            >
              เอกสาร PO ใน Google Drive
            </h3>
            <p
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              แสดง {filteredRecords.length} จาก {records.length} ไฟล์ · ผู้ใช้งาน {currentUser.displayName}
            </p>
          </div>
        </div>

        {loading ? (
          <div
            className="
              flex
              min-h-72
              items-center
              justify-center
              gap-3
              text-sm
              text-slate-500
            "
          >
            <LoaderCircle
              className="animate-spin"
              size={22}
            />
            กำลังโหลดแฟ้มเอกสาร...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div
            className="
              flex
              min-h-72
              flex-col
              items-center
              justify-center
              text-center
              text-slate-500
            "
          >
            <FolderArchive size={36} />
            <p
              className="
                mt-4
                font-medium
                text-slate-700
              "
            >
              ยังไม่พบเอกสาร
            </p>
            <p className="mt-1 text-xs">
              ไฟล์จะปรากฏหลังประมวลผลหน้าแยกและเปลี่ยนชื่อ PO
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="
                w-full
                min-w-[900px]
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
                  <th className="px-5 py-3">เลข PO</th>
                  <th className="px-5 py-3">วันที่เอกสาร</th>
                  <th className="px-5 py-3">คลัง</th>
                  <th className="px-5 py-3">ชื่อไฟล์</th>
                  <th className="px-5 py-3">ขนาด</th>
                  <th className="px-5 py-3">บันทึกเมื่อ</th>
                  <th className="px-5 py-3 text-right">เปิดเอกสาร</th>
                </tr>
              </thead>

              <tbody
                className="
                  divide-y
                  divide-slate-100
                  text-sm
                "
              >
                {filteredRecords.map(
                  (record) => (
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
                        {formatThaiDate(record.documentDate)}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {record.warehouse}
                      </td>
                      <td className="max-w-xs truncate px-5 py-4 text-slate-600">
                        {record.fileName}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {formatFileSize(record.fileSize)}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {formatThaiDateTime(record.uploadedAt)}
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
                              void openPreview(record);
                            }}
                            disabled={openingId === record.id}
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
                            {openingId === record.id
                              ? "กำลังเปิด..."
                              : "Preview"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              void openUrl(record.fileUrl);
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
                            <ExternalLink size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {previewUrl && (
        <div
          className="
            fixed
            inset-0
            z-[120]
            flex
            items-center
            justify-center
            bg-slate-950/65
            p-5
            backdrop-blur-sm
          "
        >
          <div
            className="
              flex
              h-[90vh]
              w-full
              max-w-6xl
              flex-col
              overflow-hidden
              rounded-2xl
              bg-white
              shadow-2xl
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-slate-200
                px-5
                py-4
              "
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {previewName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Preview จาก Google Drive
                </p>
              </div>

              <button
                type="button"
                onClick={closePreview}
                className="
                  rounded-lg
                  border
                  border-slate-200
                  p-2
                  text-slate-500
                  hover:bg-slate-100
                "
              >
                <X size={19} />
              </button>
            </div>

            <iframe
              title={previewName}
              src={previewUrl}
              className="min-h-0 flex-1"
            />
          </div>
        </div>
      )}
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
  icon: React.ReactNode;
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

function formatFileSize(
  bytes: number,
): string {
  if (!bytes) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(2)} MB`;
}

function formatThaiDate(
  value: string,
): string {
  if (!value) {
    return "-";
  }

  const date =
    new Date(
      `${value}T00:00:00`,
    );

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
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function formatThaiDateTime(
  value: string,
): string {
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

  return new Intl.DateTimeFormat(
    "th-TH",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function getErrorMessage(
  reason: unknown,
): string {
  if (reason instanceof Error) {
    return reason.message;
  }

  return String(reason);
}
