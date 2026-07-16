import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import type {
  AppUser,
} from "../../../auth/auth.types";

import {
  poDataService,
} from "../../../services/poDataService";

import {
  MAX_PDF_SIZE,
  base64ToPdfUrl,
  fileToBase64,
} from "../../../utils/fileEncoding";

import { ConfirmDialog } from "./ConfirmDialog";
import { CreatePoModal } from "./CreatePoModal";
import { EditPoModal } from "./EditPoModal";
import { OperationIndicator } from "./OperationIndicator";
import { PdfPreviewModal } from "./PdfPreviewModal";
import { PoDataFilters } from "./PoDataFilters";
import { PoDataHeader } from "./PoDataHeader";
import { PoDataStats } from "./PoDataStats";
import { PoDataTable } from "./PoDataTable";
import { PoDetailsModal } from "./PoDetailsModal";

import type {
  NewPoInput,
  PoHistoryRecord,
  PoRecord,
  PoStatus,
} from "./poData.types";

interface PoDataPageProps {
  currentUser: AppUser;
  onBack: () => void;
}

type ConnectionStatus =
  | "connecting"
  | "connected"
  | "error";

export function PoDataPage({
  currentUser,
  onBack,
}: PoDataPageProps) {
  const isAdmin =
    currentUser.role === "admin";

  const [records, setRecords] =
    useState<PoRecord[]>([]);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState<"all" | PoStatus>(
      "all",
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    connectionStatus,
    setConnectionStatus,
  ] = useState<ConnectionStatus>(
    "connecting",
  );

  const [
    uploadingId,
    setUploadingId,
  ] = useState("");

  const [
    previewingId,
    setPreviewingId,
  ] = useState("");

  const [
    updatingStatusId,
    setUpdatingStatusId,
  ] = useState("");

  const [
    deletingId,
    setDeletingId,
  ] = useState("");

  const [clearing, setClearing] =
    useState(false);

  const [
    operationMessage,
    setOperationMessage,
  ] = useState("");

  const [
    showCreateModal,
    setShowCreateModal,
  ] = useState(false);

  const [
    showClearConfirm,
    setShowClearConfirm,
  ] = useState(false);

  const [
    editingRecord,
    setEditingRecord,
  ] = useState<PoRecord | null>(
    null,
  );

  const [
    deletingRecord,
    setDeletingRecord,
  ] = useState<PoRecord | null>(
    null,
  );

  const [
    previewRecord,
    setPreviewRecord,
  ] = useState<PoRecord | null>(
    null,
  );

  const [
    detailsRecord,
    setDetailsRecord,
  ] = useState<PoRecord | null>(
    null,
  );

  const [
    historyRecords,
    setHistoryRecords,
  ] = useState<
    PoHistoryRecord[]
  >([]);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(false);

  const [
    historyError,
    setHistoryError,
  ] = useState("");

  const loadRecords =
    useCallback(async () => {
      setLoading(true);
      setError("");
      setConnectionStatus(
        "connecting",
      );

      setOperationMessage(
        "กำลังโหลดข้อมูลจาก Google Sheets...",
      );

      try {
        const result =
          await poDataService.list();

        setRecords(
          Array.isArray(result)
            ? result
            : [],
        );

        setConnectionStatus(
          "connected",
        );
      } catch (requestError) {
        setConnectionStatus(
          "error",
        );

        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setLoading(false);
        setOperationMessage("");
      }
    }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const filteredRecords =
    useMemo(() => {
      const keyword = search
        .trim()
        .toLowerCase();

      return records.filter(
        (record) => {
          const matchesSearch =
            !keyword ||
            record.poNumber
              .toLowerCase()
              .includes(keyword) ||
            record.ivNumber
              .toLowerCase()
              .includes(keyword) ||
            (
              record.reference ??
              ""
            )
              .toLowerCase()
              .includes(keyword) ||
            (
              record.customerName ??
              ""
            )
              .toLowerCase()
              .includes(keyword) ||
            (
              record.assignee ??
              ""
            )
              .toLowerCase()
              .includes(keyword);

          const matchesStatus =
            status === "all" ||
            record.status === status;

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      records,
      search,
      status,
    ]);

  const createRecord = async (
    input: NewPoInput,
  ) => {
    if (!isAdmin) {
      setError(
        "สิทธิ์ User ไม่สามารถเพิ่มรายการได้",
      );
      return;
    }

    setSaving(true);
    setError("");

    setOperationMessage(
      "กำลังบันทึกรายการ PO...",
    );

    try {
      const newRecord =
        await poDataService.create(
          input,
        );

      setRecords((current) => [
        newRecord,
        ...current,
      ]);

      setShowCreateModal(false);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setSaving(false);
      setOperationMessage("");
    }
  };

  const updateRecord = async (
    id: string,
    input: NewPoInput,
  ) => {
    if (!isAdmin) {
      setError(
        "สิทธิ์ User ไม่สามารถแก้ไขรายการได้",
      );
      return;
    }

    setSaving(true);
    setError("");

    setOperationMessage(
      "กำลังบันทึกการแก้ไข...",
    );

    try {
      const updatedRecord =
        await poDataService.update(
          id,
          input,
        );

      setRecords((current) =>
        current.map((record) =>
          record.id === id
            ? updatedRecord
            : record,
        ),
      );

      setEditingRecord(null);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setSaving(false);
      setOperationMessage("");
    }
  };

  const changeStatus = async (
    id: string,
    nextStatus: PoStatus,
  ) => {
    if (!isAdmin) {
      setError(
        "สิทธิ์ User ไม่สามารถเปลี่ยนสถานะได้",
      );
      return;
    }

    const previousRecords =
      records.map((record) => ({
        ...record,
      }));

    setError("");
    setUpdatingStatusId(id);

    setOperationMessage(
      "กำลังอัปเดตสถานะรายการ...",
    );

    setRecords((current) =>
      current.map((record) =>
        record.id === id
          ? {
              ...record,
              status: nextStatus,
            }
          : record,
      ),
    );

    try {
      const updatedRecord =
        await poDataService.updateStatus(
          id,
          nextStatus,
        );

      setRecords((current) =>
        current.map((record) =>
          record.id === id
            ? {
                ...record,
                ...updatedRecord,
              }
            : record,
        ),
      );
    } catch (requestError) {
      setRecords(previousRecords);

      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setUpdatingStatusId("");
      setOperationMessage("");
    }
  };

  const uploadPdf = async (
    id: string,
    file: File,
  ) => {
    if (
      file.type !==
        "application/pdf" &&
      !file.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      setError(
        "รองรับเฉพาะไฟล์ PDF เท่านั้น",
      );
      return;
    }

    if (
      file.size >
      MAX_PDF_SIZE
    ) {
      setError(
        "ไฟล์ PDF ต้องมีขนาดไม่เกิน 8 MB",
      );
      return;
    }

    setUploadingId(id);
    setError("");

    setOperationMessage(
      "กำลังอัปโหลด PDF ไป Google Drive...",
    );

    try {
      const base64Data =
        await fileToBase64(file);

      const updatedRecord =
        await poDataService.uploadPdf(
          id,
          file.name,
          base64Data,
        );

      setRecords((current) =>
        current.map((record) =>
          record.id === id
            ? updatedRecord
            : record,
        ),
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setUploadingId("");
      setOperationMessage("");
    }
  };

  const previewPdf = async (
    record: PoRecord,
  ) => {
    if (record.pdfUrl) {
      setPreviewRecord(record);
      return;
    }

    if (!record.pdfFileId) {
      setError(
        "รายการนี้ยังไม่มีเอกสาร PDF",
      );
      return;
    }

    setPreviewingId(record.id);
    setError("");

    setOperationMessage(
      "กำลังดาวน์โหลด PDF สำหรับ Preview...",
    );

    try {
      const pdf =
        await poDataService.getPdf(
          record.id,
        );

      const pdfUrl =
        base64ToPdfUrl(
          pdf.base64Data,
        );

      const recordWithPreview: PoRecord = {
        ...record,
        pdfName:
          pdf.fileName,
        pdfUrl,
      };

      setRecords((current) =>
        current.map((item) =>
          item.id === record.id
            ? recordWithPreview
            : item,
        ),
      );

      setPreviewRecord(
        recordWithPreview,
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setPreviewingId("");
      setOperationMessage("");
    }
  };

  const openDetails = async (
    record: PoRecord,
  ) => {
    setDetailsRecord(record);
    setHistoryRecords([]);
    setHistoryError("");
    setHistoryLoading(true);

    try {
      const result =
        await poDataService.history(
          record.id,
        );

      setHistoryRecords(
        Array.isArray(result)
          ? result
          : [],
      );
    } catch (requestError) {
      setHistoryError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const deleteRecord =
    async () => {
      if (!isAdmin) {
        setError(
          "สิทธิ์ User ไม่สามารถลบรายการได้",
        );
        return;
      }

      if (!deletingRecord) {
        return;
      }

      const recordId =
        deletingRecord.id;

      setDeletingId(recordId);
      setError("");

      setOperationMessage(
        "กำลังย้ายรายการและ PDF ไปถังขยะ...",
      );

      try {
        await poDataService.delete(
          recordId,
        );

        setRecords((current) =>
          current.filter(
            (record) =>
              record.id !==
              recordId,
          ),
        );

        setDeletingRecord(null);
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setDeletingId("");
        setOperationMessage("");
      }
    };

  const clearAllRecords =
    async () => {
      if (!isAdmin) {
        setError(
          "สิทธิ์ User ไม่สามารถล้างข้อมูลได้",
        );
        return;
      }

      setClearing(true);
      setError("");

      setOperationMessage(
        "กำลังล้างข้อมูลทั้งหมด...",
      );

      try {
        await poDataService.clearAll();

        setRecords([]);
        setShowClearConfirm(false);
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setClearing(false);
        setOperationMessage("");
      }
    };

  const connectionState =
    getConnectionState(
      connectionStatus,
    );

  return (
    <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
      <PoDataHeader
        currentUser={
          currentUser
        }
        canClear={
          isAdmin &&
          records.length > 0
        }
        clearing={clearing}
        onBack={onBack}
        onCreate={() => {
          if (isAdmin) {
            setShowCreateModal(
              true,
            );
          }
        }}
        onClear={() => {
          if (isAdmin) {
            setShowClearConfirm(
              true,
            );
          }
        }}
      />

      <section className="mt-6 flex flex-col gap-4 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.035] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`h-2 w-2 rounded-full ${connectionState.dotClass}`}
          />

          <div>
            <p className="text-xs text-slate-300">
              Google Apps Script
            </p>

            <p
              className={`mt-0.5 text-[10px] tracking-[0.12em] ${connectionState.textClass}`}
            >
              {connectionState.label}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadRecords()
          }
          disabled={loading}
          className="flex items-center justify-center gap-2 text-xs text-cyan-300 transition hover:text-cyan-200 disabled:cursor-wait disabled:opacity-40"
        >
          <RefreshCw
            size={15}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          {loading
            ? "กำลังโหลดข้อมูล..."
            : "โหลดข้อมูลใหม่"}
        </button>
      </section>

      {error && (
        <section className="mt-4 flex items-start gap-3 rounded-xl border border-red-300/20 bg-red-300/[0.07] px-4 py-3 text-sm text-red-200">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-medium">
              ไม่สามารถดำเนินการได้
            </p>

            <p className="mt-1 text-xs leading-6 text-red-200/80">
              {error}
            </p>
          </div>
        </section>
      )}

      <PoDataStats
        records={records}
      />

      <PoDataFilters
        search={search}
        status={status}
        onSearchChange={
          setSearch
        }
        onStatusChange={
          setStatus
        }
      />

      {loading ? (
        <section className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-cyan-300/10 bg-[#051322]/60">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05]">
            <LoaderCircle
              size={31}
              className="animate-spin text-cyan-300"
            />
          </div>

          <p className="mt-5 text-sm text-slate-400">
            กำลังโหลดข้อมูลจาก Google Sheets
          </p>
        </section>
      ) : (
        <PoDataTable
          isAdmin={isAdmin}
          records={
            filteredRecords
          }
          uploadingId={
            uploadingId
          }
          previewingId={
            previewingId
          }
          updatingStatusId={
            updatingStatusId
          }
          deletingId={
            deletingId
          }
          onStatusChange={(
            id,
            nextStatus,
          ) => {
            if (isAdmin) {
              void changeStatus(
                id,
                nextStatus,
              );
            }
          }}
          onPdfUpload={(
            id,
            file,
          ) => {
            void uploadPdf(
              id,
              file,
            );
          }}
          onPdfPreview={(
            record,
          ) => {
            void previewPdf(
              record,
            );
          }}
          onViewDetails={(
            record,
          ) => {
            void openDetails(
              record,
            );
          }}
          onEdit={(record) => {
            if (isAdmin) {
              setEditingRecord(
                record,
              );
            }
          }}
          onDelete={(record) => {
            if (isAdmin) {
              setDeletingRecord(
                record,
              );
            }
          }}
        />
      )}

      {isAdmin &&
        showCreateModal && (
          <CreatePoModal
            saving={saving}
            onClose={() => {
              if (!saving) {
                setShowCreateModal(
                  false,
                );
              }
            }}
            onSave={(input) => {
              if (!saving) {
                void createRecord(
                  input,
                );
              }
            }}
          />
        )}

      {isAdmin &&
        editingRecord && (
          <EditPoModal
            record={
              editingRecord
            }
            saving={saving}
            onClose={() => {
              if (!saving) {
                setEditingRecord(
                  null,
                );
              }
            }}
            onSave={(
              id,
              input,
            ) => {
              if (!saving) {
                void updateRecord(
                  id,
                  input,
                );
              }
            }}
          />
        )}

      {isAdmin &&
        deletingRecord && (
          <ConfirmDialog
            title="ลบรายการ PO"
            description={`ต้องการลบ PO ${deletingRecord.poNumber} ใช่หรือไม่?`}
            confirmText="ลบรายการ"
            processing={
              deletingId ===
              deletingRecord.id
            }
            onCancel={() => {
              if (!deletingId) {
                setDeletingRecord(
                  null,
                );
              }
            }}
            onConfirm={() => {
              void deleteRecord();
            }}
          />
        )}

      {isAdmin &&
        showClearConfirm && (
          <ConfirmDialog
            title="ล้างข้อมูลทั้งหมด"
            description={`ต้องการล้างข้อมูลทั้งหมด ${records.length} รายการใช่หรือไม่?`}
            confirmText="ล้างข้อมูลทั้งหมด"
            processing={clearing}
            onCancel={() => {
              if (!clearing) {
                setShowClearConfirm(
                  false,
                );
              }
            }}
            onConfirm={() => {
              void clearAllRecords();
            }}
          />
        )}

      {detailsRecord && (
        <PoDetailsModal
          record={
            detailsRecord
          }
          history={
            historyRecords
          }
          loading={
            historyLoading
          }
          error={historyError}
          onClose={() => {
            setDetailsRecord(
              null,
            );
            setHistoryRecords(
              [],
            );
            setHistoryError("");
          }}
          onPreviewPdf={(
            record,
          ) => {
            setDetailsRecord(
              null,
            );
            void previewPdf(
              record,
            );
          }}
        />
      )}

      {previewRecord?.pdfUrl && (
        <PdfPreviewModal
          fileName={
            previewRecord.pdfName ??
            "PDF Document"
          }
          fileUrl={
            previewRecord.pdfUrl
          }
          onClose={() =>
            setPreviewRecord(
              null,
            )
          }
        />
      )}

      <OperationIndicator
        message={
          operationMessage
        }
      />
    </div>
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

  return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
}

function getConnectionState(
  status: ConnectionStatus,
) {
  if (
    status === "connecting"
  ) {
    return {
      label: "CONNECTING",
      dotClass:
        "animate-pulse bg-amber-300 shadow-[0_0_9px_#fcd34d]",
      textClass:
        "text-amber-300",
    };
  }

  if (status === "error") {
    return {
      label:
        "CONNECTION ERROR",
      dotClass:
        "animate-pulse bg-red-300 shadow-[0_0_9px_#fca5a5]",
      textClass:
        "text-red-300",
    };
  }

  return {
    label: "CONNECTED",
    dotClass:
      "animate-pulse bg-emerald-300 shadow-[0_0_9px_#6ee7b7]",
    textClass:
      "text-emerald-300",
  };
}