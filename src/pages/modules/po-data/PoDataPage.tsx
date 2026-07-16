import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";

import { poDataService } from "../../../services/poDataService";
import { CreatePoModal } from "./CreatePoModal";
import { PdfPreviewModal } from "./PdfPreviewModal";
import { PoDataFilters } from "./PoDataFilters";
import { PoDataHeader } from "./PoDataHeader";
import { PoDataStats } from "./PoDataStats";
import { PoDataTable } from "./PoDataTable";

import type {
  NewPoInput,
  PoRecord,
  PoStatus,
} from "./poData.types";

interface PoDataPageProps {
  onBack: () => void;
}

export function PoDataPage({
  onBack,
}: PoDataPageProps) {
  const [records, setRecords] = useState<PoRecord[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<"all" | PoStatus>("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [previewRecord, setPreviewRecord] =
    useState<PoRecord | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await poDataService.list();
      setRecords(result);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !keyword ||
        record.ivNumber.toLowerCase().includes(keyword) ||
        record.poNumber.toLowerCase().includes(keyword) ||
        record.branch.toLowerCase().includes(keyword) ||
        record.assignee.toLowerCase().includes(keyword);

      const matchesStatus =
        status === "all" || record.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [records, search, status]);

  const createRecord = async (input: NewPoInput) => {
    setSaving(true);
    setError("");

    try {
      const newRecord =
        await poDataService.create(input);

      setRecords((current) => [
        newRecord,
        ...current,
      ]);

      setShowCreateModal(false);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (
    id: string,
    nextStatus: PoStatus,
  ) => {
    const previousRecords = records;

    setError("");

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
      setError(getErrorMessage(requestError));
    }
  };

  const uploadPdfTemporarily = (
    id: string,
    file: File,
  ) => {
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("รองรับเฉพาะไฟล์ PDF เท่านั้น");
      return;
    }

    const fileUrl = URL.createObjectURL(file);

    setRecords((current) =>
      current.map((record) =>
        record.id === id
          ? {
              ...record,
              pdfName: file.name,
              pdfUrl: fileUrl,
            }
          : record,
      ),
    );
  };

  return (
    <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
      <PoDataHeader
        onBack={onBack}
        onCreate={() => setShowCreateModal(true)}
      />

      <div className="mt-6 flex items-center justify-between rounded-xl border border-cyan-300/10 bg-cyan-300/[0.035] px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className={`h-2 w-2 rounded-full ${
              error
                ? "bg-red-300 shadow-[0_0_9px_#fca5a5]"
                : "bg-emerald-300 shadow-[0_0_9px_#6ee7b7]"
            }`}
          />

          <div>
            <p className="text-xs text-slate-300">
              Google Apps Script
            </p>

            <p
              className={`mt-0.5 text-[10px] ${
                error
                  ? "text-red-300"
                  : "text-emerald-300"
              }`}
            >
              {error ? "CONNECTION ERROR" : "CONNECTED"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadRecords()}
          disabled={loading}
          className="flex items-center gap-2 text-xs text-cyan-300 transition hover:text-cyan-200 disabled:opacity-40"
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin" : ""}
          />
          โหลดข้อมูลใหม่
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-300/20 bg-red-300/[0.07] px-4 py-3 text-sm text-red-200">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />
          {error}
        </div>
      )}

      <PoDataStats records={records} />

      <PoDataFilters
        search={search}
        status={status}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
      />

      {loading ? (
        <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-cyan-300/10 bg-[#051322]/60">
          <LoaderCircle
            size={32}
            className="animate-spin text-cyan-300"
          />

          <p className="mt-4 text-sm text-slate-400">
            กำลังโหลดข้อมูลจาก Google Sheets
          </p>
        </div>
      ) : (
        <PoDataTable
          records={filteredRecords}
          onStatusChange={changeStatus}
          onPdfUpload={uploadPdfTemporarily}
          onPdfPreview={setPreviewRecord}
        />
      )}

      {showCreateModal && (
        <CreatePoModal
          onClose={() => {
            if (!saving) {
              setShowCreateModal(false);
            }
          }}
          onSave={(input) => {
            if (!saving) {
              void createRecord(input);
            }
          }}
        />
      )}

      {previewRecord?.pdfUrl && (
        <PdfPreviewModal
          fileName={previewRecord.pdfName ?? "PDF"}
          fileUrl={previewRecord.pdfUrl}
          onClose={() => setPreviewRecord(null)}
        />
      )}
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
}