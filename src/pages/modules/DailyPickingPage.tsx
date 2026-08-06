import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  listen,
  type UnlistenFn,
} from "@tauri-apps/api/event";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Files,
  FolderOpen,
  LoaderCircle,
  Play,
  ScrollText,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";

import {
  pdfSplitterService,
} from "../../services/pdfSplitterService";

import {
  ProcessStatusOverlay,
} from "../../components/common/ProcessStatusOverlay";

import {
  poArchiveService,
} from "../../services/poArchiveService";

import {
  isAppsScriptQueuedError,
} from "../../services/appsScriptClient";

import {
  hasDriveGateway,
} from "../../services/driveGatewayClient";

import type {
  PdfSplitLogEvent,
  PdfSplitLogLevel,
  PdfSplitResult,
} from "../../types/pdfSplitter.types";

interface DailyPickingPageProps {
  onBack: () => void;
  initialPdfPath?: string;
  onInitialPdfConsumed?: () => void;
  onNextProcess: () => void;
}

interface VisibleLog {
  id: number;
  level: PdfSplitLogLevel;
  message: string;
}

interface ProcessStatus {
  title: string;
  description: string;
  progress?: number;
}

export function DailyPickingPage({
  onBack,
  initialPdfPath = "",
  onInitialPdfConsumed,
  onNextProcess,
}: DailyPickingPageProps) {
  const receivedPdfRef =
    useRef("");

  const [
    pdfPath,
    setPdfPath,
  ] = useState(
    "",
  );

  const [
    outputBase,
    setOutputBase,
  ] = useState(
    "",
  );

  const [
    processing,
    setProcessing,
  ] = useState(
    false,
  );

  const [
    processStatus,
    setProcessStatus,
  ] = useState<ProcessStatus>({
    title:
      "กำลังประมวลผลและแยกไฟล์ PO...",
    description:
      "ระบบกำลังอ่านเอกสารและจัดเตรียมไฟล์",
  });

  const [
    logs,
    setLogs,
  ] = useState<VisibleLog[]>(
    [],
  );

  const [
    result,
    setResult,
  ] = useState<
    PdfSplitResult | null
  >(
    null,
  );

  const [
    error,
    setError,
  ] = useState(
    "",
  );

  const logSequence =
    useRef(
      0,
    );

  const logEndRef =
    useRef<
      HTMLDivElement | null
    >(
      null,
    );

  useEffect(() => {
    void pdfSplitterService
      .getOutputBase()
      .then(
        setOutputBase,
      )
      .catch((reason) => {
        setError(
          getErrorMessage(
            reason,
          ),
        );
      });
  }, []);

  useEffect(() => {
    if (
      !initialPdfPath ||
      receivedPdfRef.current === initialPdfPath
    ) {
      return;
    }

    receivedPdfRef.current =
      initialPdfPath;

    setPdfPath(
      initialPdfPath,
    );
    setResult(null);
    setError("");
    logSequence.current += 1;
    setLogs([
      {
        id: logSequence.current,
        level: "info",
        message:
          "รับไฟล์ PDF ต้นฉบับจากขั้นตอนออกใบจัดรายวันเรียบร้อยแล้ว",
      },
    ]);
    onInitialPdfConsumed?.();
  }, [
    initialPdfPath,
    onInitialPdfConsumed,
  ]);

  useEffect(() => {
    let active = true;
    let unlisten:
      UnlistenFn | undefined;

    void listen<
      PdfSplitLogEvent
    >(
      "po-split-log",
      (event) => {
        const payload =
          event.payload;

        if (
          payload.level ===
          "progress"
        ) {
          setLogs((current) => {
            const lastEntry =
              current[
                current.length - 1
              ];

            if (
              lastEntry?.level ===
              "progress"
            ) {
              return [
                ...current.slice(
                  0,
                  -1,
                ),
                {
                  ...lastEntry,
                  message:
                    payload.message,
                },
              ];
            }

            logSequence.current += 1;

            return [
              ...current,
              {
                id:
                  logSequence.current,
                level:
                  "progress",
                message:
                  payload.message,
              },
            ];
          });

          return;
        }

        logSequence.current += 1;

        setLogs((current) => [
          ...current,
          {
            id:
              logSequence.current,
            level:
              payload.level,
            message:
              payload.message,
          },
        ]);
      },
    ).then((stopListening) => {
      if (active) {
        unlisten =
          stopListening;
      } else {
        stopListening();
      }
    });

    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    logEndRef.current
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }, [logs]);

  const addLocalLog = (
    level: PdfSplitLogLevel,
    message: string,
  ) => {
    logSequence.current += 1;

    setLogs((current) => [
      ...current,
      {
        id:
          logSequence.current,
        level,
        message,
      },
    ]);
  };

  const uploadCreatedFiles = async (
    splitResult: PdfSplitResult,
  ) => {
    const createdRecords =
      splitResult.records.filter(
        (record) =>
          record.status ===
            "created" ||
          record.status ===
            "duplicate",
      );

    if (
      createdRecords.length === 0
    ) {
      addLocalLog(
        "info",
        "ไม่มีไฟล์ผลลัพธ์ที่ต้องตรวจสอบกับแฟ้มบันทึกข้อมูล",
      );
      return;
    }

    let uploadedCount = 0;
    let duplicateCount = 0;
    let queuedCount = 0;
    let failedCount = 0;
    let completedCount = 0;
    let nextIndex = 0;
    let recordsToUpload =
      createdRecords;

    setProcessStatus({
      title:
        "กำลังตรวจสอบแฟ้ม Google Drive...",
      description:
        `กำลังตรวจสารบัญก่อนอัปโหลด ${createdRecords.length} ไฟล์`,
    });

    addLocalLog(
      "info",
      `กำลังตรวจสอบสารบัญ Google Drive สำหรับ ${createdRecords.length} ไฟล์`,
    );

    try {
      const archiveRecords =
        await poArchiveService.list();
      const existingPoNumbers =
        new Set(
          archiveRecords.map(
            (record) =>
              String(
                record.poNumber || "",
              )
                .trim()
                .toUpperCase(),
          ),
        );

      recordsToUpload =
        createdRecords.filter(
          (record) =>
            !existingPoNumbers.has(
              String(
                record.po_number || "",
              )
                .trim()
                .toUpperCase(),
            ),
        );

      duplicateCount =
        createdRecords.length -
        recordsToUpload.length;
      completedCount =
        duplicateCount;

      if (duplicateCount > 0) {
        addLocalLog(
          "warning",
          `ตรวจสารบัญครั้งเดียวและข้าม PO ที่มีใน Drive แล้ว ${duplicateCount} ไฟล์`,
        );
      }
    } catch (reason) {
      addLocalLog(
        "warning",
        `อ่านสารบัญ Drive ล่วงหน้าไม่สำเร็จ ระบบจะตรวจซ้ำระหว่างอัปโหลด — ${getErrorMessage(reason)}`,
      );
    }

    const uploadConcurrency =
      hasDriveGateway() ? 6 : 3;

    addLocalLog(
      "info",
      `เริ่มบันทึก Google Drive ${completedCount} / ${createdRecords.length} ไฟล์ (อัปโหลดพร้อมกันสูงสุด ${uploadConcurrency} ไฟล์)`,
    );

    setProcessStatus({
      title:
        "กำลังอัปโหลดไฟล์ขึ้น Google Drive...",
      description:
        `ดำเนินการแล้ว ${completedCount} จาก ${createdRecords.length} ไฟล์ · ข้ามซ้ำ ${duplicateCount}`,
      progress:
        (completedCount /
          createdRecords.length) *
        100,
    });

    if (recordsToUpload.length === 0) {
      addLocalLog(
        "success",
        "เอกสารทั้งหมดมีอยู่ในแฟ้ม Google Drive แล้ว",
      );

      setProcessStatus({
        title:
          "ตรวจสอบ Google Drive เรียบร้อยแล้ว",
        description:
          `พบเอกสารครบทั้ง ${createdRecords.length} ไฟล์ ไม่ต้องอัปโหลดซ้ำ`,
        progress: 100,
      });
      return;
    }

    const uploadOne = async (
      record:
        PdfSplitResult["records"][number],
    ) => {
      return poArchiveService
        .uploadFromPath({
          path:
            record.output_path,
          poNumber:
            record.po_number,
          documentDate:
            record.document_date,
          warehouse:
            record.warehouse,
          fileName:
            `${record.po_number}.pdf`,
        });
    };

    const worker = async () => {
      while (true) {
        const index =
          nextIndex;

        nextIndex += 1;

        if (
          index >=
          recordsToUpload.length
        ) {
          return;
        }

        const record =
          recordsToUpload[index];

        try {
          const uploadResult =
            await uploadOne(
              record,
            );

          if (
            uploadResult.status ===
            "duplicate"
          ) {
            duplicateCount += 1;

            addLocalLog(
              "warning",
              `${record.po_number}: พบในแฟ้ม Google Drive แล้ว ระบบไม่บันทึกซ้ำ`,
            );
          } else {
            uploadedCount += 1;
          }
        } catch (reason) {
          if (
            isAppsScriptQueuedError(
              reason,
            )
          ) {
            queuedCount += 1;

            addLocalLog(
              "warning",
              `${record.po_number}: รับงานไว้ในเครื่องแล้ว ระบบจะซิงก์ Google Drive อัตโนมัติ`,
            );
          } else {
            failedCount += 1;

            addLocalLog(
              "error",
              `${record.po_number}: บันทึก Google Drive ไม่สำเร็จ — ${getErrorMessage(reason)}`,
            );
          }
        } finally {
          completedCount += 1;

          setProcessStatus({
            title:
              "กำลังอัปโหลดไฟล์ขึ้น Google Drive...",
            description:
              `ดำเนินการแล้ว ${completedCount} จาก ${createdRecords.length} ไฟล์ · สำเร็จ ${uploadedCount} · ข้ามซ้ำ ${duplicateCount}`,
            progress:
              (completedCount /
                createdRecords.length) *
              100,
          });

          addLocalLog(
            "progress",
            `บันทึก Google Drive ${completedCount} / ${createdRecords.length} ไฟล์`,
          );
        }
      }
    };

    const workerCount =
      Math.min(
        uploadConcurrency,
        recordsToUpload.length,
      );

    await Promise.all(
      Array.from(
        {
          length:
            workerCount,
        },
        () => worker(),
      ),
    );

    if (uploadedCount > 0) {
      addLocalLog(
        "success",
        `บันทึกเข้าแฟ้ม Google Drive สำเร็จ ${uploadedCount} ไฟล์`,
      );
    }

    if (duplicateCount > 0) {
      addLocalLog(
        "warning",
        `ข้ามเอกสารซ้ำบน Drive ${duplicateCount} ไฟล์`,
      );
    }

    if (queuedCount > 0) {
      addLocalLog(
        "warning",
        `เก็บไว้ในคิวซิงก์ ${queuedCount} ไฟล์ สามารถทำงานต่อได้ ระบบจะส่งขึ้น Drive เบื้องหลัง`,
      );
    }

    if (failedCount > 0) {
      addLocalLog(
        "error",
        `อัปโหลดไม่สำเร็จ ${failedCount} ไฟล์ ไฟล์ในเครื่องยังอยู่ครบ สามารถกดประมวลผลอีกครั้งเพื่ออัปโหลดใหม่ได้`,
      );
    }

    setProcessStatus({
      title:
        "บันทึก Google Drive ครบแล้ว",
      description:
        `สำเร็จ ${uploadedCount} · ซ้ำ ${duplicateCount} · รอซิงก์ ${queuedCount} · ไม่สำเร็จ ${failedCount}`,
      progress: 100,
    });
  };

  const choosePdf = async () => {
    if (processing) {
      return;
    }

    try {
      setError(
        "",
      );

      const selected =
        await pdfSplitterService
          .selectPdf();

      if (!selected) {
        return;
      }

      setPdfPath(
        selected,
      );

      setResult(
        null,
      );

      setLogs(
        [],
      );

      addLocalLog(
        "info",
        `เลือกไฟล์แล้ว: ${selected}`,
      );
    } catch (reason) {
      setError(
        getErrorMessage(
          reason,
        ),
      );
    }
  };

  const processPdf = async () => {
    if (
      processing ||
      !pdfPath ||
      !outputBase
    ) {
      return;
    }

    setProcessing(
      true,
    );

    setError(
      "",
    );

    setResult(
      null,
    );

    setLogs(
      [],
    );

    setProcessStatus({
      title:
        "กำลังประมวลผลและแยกไฟล์ PO...",
      description:
        "ระบบกำลังอ่านเอกสารและจัดเตรียมไฟล์",
    });

    addLocalLog(
      "info",
      "เริ่มประมวลผลและแยกไฟล์ PO",
    );

    try {
      const nextResult =
        await pdfSplitterService
          .process({
            pdfPath,
            outputBase,
          });

      setResult(
        nextResult,
      );

      addLocalLog(
        "success",
        `ประมวลผลสำเร็จ สร้างไฟล์ ${nextResult.created_count} รายการ`,
      );

      await uploadCreatedFiles(
        nextResult,
      );

      if (
        nextResult.duplicate_count > 0 &&
        nextResult.duplicate_folders.length > 0
      ) {
        addLocalLog(
          "warning",
          `พบไฟล์ซ้ำ ${nextResult.duplicate_count} รายการ ระบบไม่ได้สร้างไฟล์ซ้ำ`,
        );
      }

      if (
        nextResult.output_folders.length > 0
      ) {
        const destinationFolder =
          nextResult.output_folders[0];

        addLocalLog(
          "info",
          `กำลังเปิดโฟลเดอร์ปลายทาง: ${destinationFolder}`,
        );

        setProcessStatus({
          title:
            "กำลังเปิดโฟลเดอร์ที่บันทึก...",
          description:
            "การแยกไฟล์และบันทึก Google Drive เสร็จเรียบร้อยแล้ว",
        });

        try {
          await pdfSplitterService
            .openFolder(
              destinationFolder,
            );
        } catch (openReason) {
          addLocalLog(
            "error",
            `สร้างไฟล์สำเร็จ แต่เปิดโฟลเดอร์ปลายทางไม่ได้: ${getErrorMessage(openReason)}`,
          );
        }
      }
    } catch (reason) {
      const message =
        getErrorMessage(
          reason,
        );

      setError(
        message,
      );

      addLocalLog(
        "error",
        message,
      );
    } finally {
      setProcessing(
        false,
      );
    }
  };

  const openOutputFolder =
    async () => {
      try {
        setError(
          "",
        );

        await pdfSplitterService
          .openFolder(
            result?.output_base ??
              outputBase,
          );
      } catch (reason) {
        setError(
          getErrorMessage(
            reason,
          ),
        );
      }
    };

  const clearLogs = () => {
    setLogs(
      [],
    );

    logSequence.current = 0;
  };

  return (
    <div
      className="
        vp-work-page
        split-rename-workspace
        mx-auto
        max-w-[1500px]
        px-6
        py-8
        lg:px-10
      "
    >
      <ProcessStatusOverlay
        open={processing}
        title={processStatus.title}
        description={
          processStatus.description
        }
        progress={
          processStatus.progress
        }
      />
      <header
        className="
          vp-page-header
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
            disabled={processing}
            className="
              mb-5
              flex
              items-center
              gap-2
              text-sm
              text-slate-500
              transition
              hover:text-cyan-300
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            <ArrowLeft
              size={17}
            />

            กลับหน้าแดชบอร์ด
          </button>

          <p
            className="
              text-[10px]
              font-semibold
              tracking-[0.24em]
              text-blue-300
            "
          >
            SPLIT &amp; RENAME PO
          </p>

          <h2
            className="
              mt-2
              text-3xl
              font-semibold
              text-white
            "
          >
            แยก และเปลี่ยนชื่อ PO
          </h2>

          <p
            className="
              mt-3
              max-w-3xl
              text-sm
              leading-6
              text-slate-400
            "
          >
            แยกเฉพาะหน้าที่มีรายการสินค้า
            เปลี่ยนชื่อตามเลข PO และคลัง
            พร้อมจัดเก็บตามวันที่ในเอกสาร
          </p>
        </div>

        <div
          className="
            vp-page-icon
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-xl
            border
            border-blue-300/20
            bg-blue-300/[0.07]
            text-blue-300
          "
        >
          <Files size={23} />
        </div>
      </header>

      <section
        className="
          vp-setup-grid
          mt-7
          grid
          gap-4
          lg:grid-cols-[1.15fr_0.85fr]
        "
      >
        <button
          type="button"
          onClick={() => {
            void choosePdf();
          }}
          disabled={processing}
          className="
            vp-setup-card
            vp-upload-card
            group
            min-h-52
            rounded-2xl
            border
            border-cyan-300/20
            bg-[#071827]
            p-6
            text-left
            transition
            hover:-translate-y-0.5
            hover:border-cyan-300/40
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-xl
              border
              border-cyan-300/25
              bg-cyan-300/[0.08]
              text-cyan-300
            "
          >
            <Upload size={21} />
          </div>

          <h3
            className="
              mt-7
              font-semibold
              text-white
            "
          >
            อัปโหลดไฟล์ PDF
          </h3>

          <p
            className="
              mt-2
              text-xs
              text-slate-500
            "
          >
            เลือกไฟล์รายงาน PO จาก CP ALL
          </p>

          <p
            className="
              mt-5
              break-all
              text-xs
              leading-5
              text-emerald-300
            "
          >
            {
              pdfPath ||
              "คลิกเพื่อเลือกไฟล์ PDF"
            }
          </p>
        </button>

        <div
          className="
            vp-setup-card
            min-h-52
            rounded-2xl
            border
            border-blue-300/15
            bg-[#071827]
            p-6
          "
        >
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-xl
              border
              border-blue-300/20
              bg-blue-300/[0.07]
              text-blue-300
            "
          >
            <FolderOpen size={21} />
          </div>

          <h3
            className="
              mt-7
              font-semibold
              text-white
            "
          >
            ตำแหน่งจัดเก็บอัตโนมัติ
          </h3>

          <p
            className="
              mt-2
              text-xs
              leading-5
              text-slate-500
            "
          >
            ระบบสร้างโฟลเดอร์ปี
            เดือนภาษาไทย และวันที่จากเอกสาร PO
          </p>

          <p
            className="
              mt-5
              break-all
              text-xs
              leading-5
              text-blue-200
            "
          >
            {
              outputBase ||
              "กำลังเตรียมตำแหน่งจัดเก็บ..."
            }
          </p>
        </div>
      </section>

      {error && (
        <div
          className="
            mt-5
            flex
            items-start
            gap-3
            rounded-xl
            border
            border-red-300/20
            bg-red-300/[0.07]
            px-5
            py-4
            text-sm
            leading-6
            text-red-200
          "
        >
          <TriangleAlert
            className="mt-0.5 shrink-0"
            size={18}
          />

          <div>
            <p className="font-medium">
              ไม่สามารถดำเนินการได้
            </p>

            <p
              className="
                mt-1
                text-xs
                text-red-200/80
              "
            >
              {error}
            </p>
          </div>
        </div>
      )}

      <div
        className="
          vp-action-bar
          mt-6
          flex
          flex-col
          justify-end
          gap-3
          sm:flex-row
          sm:flex-wrap
        "
      >
        <button
          type="button"
          disabled={
            processing ||
            !pdfPath ||
            !outputBase
          }
          onClick={() => {
            void processPdf();
          }}
          className="
            vp-action-button
            vp-action-primary
            flex
            items-center
            justify-center
            gap-2
            rounded-xl
            border
            border-cyan-300/30
            bg-cyan-300/10
            px-7
            py-3
            text-sm
            font-medium
            text-cyan-200
            transition
            hover:-translate-y-0.5
            hover:bg-cyan-300/15
            disabled:cursor-not-allowed
            disabled:opacity-35
          "
        >
          {processing ? (
            <LoaderCircle
              className="animate-spin"
              size={18}
            />
          ) : (
            <Play size={18} />
          )}

          {processing
            ? "กำลังประมวลผล..."
            : "ประมวลผลและแยกไฟล์"}
        </button>

        {(result || outputBase) && (
          <button
            type="button"
            disabled={processing}
            onClick={() => {
              void openOutputFolder();
            }}
            className="
              vp-action-button
              vp-action-secondary
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-blue-300/25
              bg-blue-300/[0.08]
              px-6
              py-3
              text-sm
              font-medium
              text-blue-200
              transition
              hover:-translate-y-0.5
              hover:bg-blue-300/[0.14]
              disabled:cursor-not-allowed
              disabled:opacity-35
            "
          >
            <FolderOpen size={18} />

            เปิดโฟลเดอร์ที่บันทึก
          </button>
        )}

        {result && (
          <button
            type="button"
            disabled={processing}
            onClick={onNextProcess}
            className="
              vp-action-button
              vp-next-process
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-sky-400/40
              bg-sky-500
              px-6
              py-3
              text-sm
              font-semibold
              text-white
              shadow-lg
              shadow-sky-500/20
              transition
              hover:-translate-y-0.5
              hover:bg-sky-600
              disabled:cursor-not-allowed
              disabled:opacity-35
            "
          >
            Next Process
            <ArrowRight size={18} />
          </button>
        )}
      </div>

      {result && (
        <section
          className="
            mt-6
            grid
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          <SummaryCard
            label="จำนวนหน้าทั้งหมด"
            value={
              result.total_pages
            }
            tone="cyan"
          />

          <SummaryCard
            label="PO ที่ตรวจพบ"
            value={
              result.po_count
            }
            tone="blue"
          />

          <SummaryCard
            label="ไฟล์ที่สร้างสำเร็จ"
            value={
              result.created_count
            }
            tone="emerald"
          />

          <SummaryCard
            label="หน้าที่ไม่มีรายการและข้าม"
            value={
              result.skipped_page_count
            }
            tone="amber"
          />
        </section>
      )}

      <section
        className="
          vp-data-card
          vp-processing-log
          mt-6
          overflow-hidden
          rounded-2xl
          border
          border-slate-700/70
          bg-[#050f1a]
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-slate-700/60
            px-5
            py-4
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <ScrollText
              className="text-cyan-300"
              size={19}
            />

            <div>
              <h3
                className="
                  text-sm
                  font-semibold
                  text-white
                "
              >
                Processing LOG
              </h3>

              <p
                className="
                  mt-1
                  text-[11px]
                  text-slate-500
                "
              >
                แสดงการตรวจหน้า แยกไฟล์
                เปลี่ยนชื่อ และตำแหน่งจัดเก็บ
              </p>
            </div>
          </div>

          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <span
              className="
                rounded-full
                border
                border-slate-700
                px-3
                py-1
                text-[10px]
                text-slate-400
              "
            >
              {logs.length} EVENTS
            </span>

            <button
              type="button"
              onClick={clearLogs}
              disabled={
                processing ||
                logs.length === 0
              }
              className="
                flex
                items-center
                gap-1.5
                rounded-lg
                border
                border-red-300/20
                bg-red-300/[0.06]
                px-3
                py-1.5
                text-[10px]
                font-medium
                text-red-200
                transition
                hover:bg-red-300/[0.12]
                disabled:cursor-not-allowed
                disabled:opacity-30
              "
            >
              <Trash2 size={13} />

              เคลียร์ LOG
            </button>
          </div>
        </div>

        <div
          className="
            h-[360px]
            overflow-y-auto
            px-5
            py-4
            font-mono
            text-xs
            leading-6
          "
        >
          {logs.length === 0 ? (
            <div
              className="
                flex
                h-full
                flex-col
                items-center
                justify-center
                text-center
                text-slate-600
              "
            >
              <FileText
                size={30}
              />

              <p className="mt-3">
                LOG จะแสดงที่นี่เมื่อเริ่มประมวลผล
              </p>
            </div>
          ) : (
            logs.map((entry) => (
              <div
                key={entry.id}
                className="flex gap-3"
              >
                <span
                  className="
                    w-8
                    shrink-0
                    select-none
                    text-right
                    text-slate-700
                  "
                >
                  {entry.id}
                </span>

                <span
                  className={
                    logColor[
                      entry.level
                    ]
                  }
                >
                  [{
                    entry.level
                      .toUpperCase()
                  }]
                </span>

                <span
                  className="
                    break-all
                    text-slate-300
                  "
                >
                  {entry.message}
                </span>
              </div>
            ))
          )}

          <div ref={logEndRef} />
        </div>
      </section>
    </div>
  );
}

const logColor:
  Record<
    PdfSplitLogLevel,
    string
  > = {
    progress:
      "shrink-0 text-blue-300",
    info:
      "shrink-0 text-cyan-300",
    success:
      "shrink-0 text-emerald-300",
    warning:
      "shrink-0 text-amber-300",
    error:
      "shrink-0 text-red-300",
  };

interface SummaryCardProps {
  label: string;
  value: number;
  tone:
    | "cyan"
    | "blue"
    | "emerald"
    | "amber";
}

const summaryTone = {
  cyan:
    "border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-300",
  blue:
    "border-blue-300/20 bg-blue-300/[0.06] text-blue-300",
  emerald:
    "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-300",
  amber:
    "border-amber-300/20 bg-amber-300/[0.06] text-amber-300",
};

function SummaryCard({
  label,
  value,
  tone,
}: SummaryCardProps) {
  return (
    <div
      className={`
        vp-summary-card
        rounded-2xl
        border
        p-5
        ${summaryTone[tone]}
      `}
    >
      <CheckCircle2
        size={18}
      />

      <p
        className="
          mt-5
          text-2xl
          font-semibold
        "
      >
        {value}
      </p>

      <p
        className="
          mt-1
          text-xs
          text-slate-500
        "
      >
        {label}
      </p>
    </div>
  );
}

function getErrorMessage(
  reason: unknown,
): string {
  if (
    reason instanceof Error
  ) {
    return reason.message;
  }

  if (
    typeof reason === "string"
  ) {
    return reason;
  }

  return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
}
