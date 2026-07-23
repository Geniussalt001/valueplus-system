import {
  ArrowLeft,
  FileCheck2,
  Files,
  FolderOpen,
  PencilLine,
  Printer,
  ScanSearch,
} from "lucide-react";

import {
  FileUploadCard,
} from "../../components/split-rename-po/FileUploadCard";

import {
  IvNumberInput,
} from "../../components/split-rename-po/IvNumberInput";

import {
  LockedTemplateCard,
} from "../../components/split-rename-po/LockedTemplateCard";

import {
  PickingAdjustmentModal,
} from "../../components/split-rename-po/PickingAdjustmentModal";

import {
  PoPreviewTable,
} from "../../components/split-rename-po/PoPreviewTable";

import {
  PoProcessingSummary,
} from "../../components/split-rename-po/PoProcessingSummary";

import {
  PrintSettingsModal,
} from "../../components/split-rename-po/PrintSettingsModal";

import {
  ProcessingOverlay,
} from "../../components/split-rename-po/ProcessingOverlay";

import {
  usePoProcessor,
} from "../../hooks/usePoProcessor";

interface SplitRenamePoPageProps {
  onBack: () => void;
  onNextProcess: (pdfPath: string) => void;
}

export function SplitRenamePoPage({
  onBack,
  onNextProcess,
}: SplitRenamePoPageProps) {
  const processor =
    usePoProcessor();

  const busy =
    processor.activity !==
    "idle";

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
      <ProcessingOverlay
        activity={
          processor.activity
        }
      />

      <PickingAdjustmentModal
        open={
          processor
            .adjustmentModalOpen
        }
        records={
          processor.preview
            ?.records ?? []
        }
        overrides={
          processor
            .quantityOverrides
        }
        disabled={busy}
        onClose={
          processor
            .closeAdjustmentModal
        }
        onChange={
          processor
            .setQuantityOverride
        }
        onRestore={
          processor
            .restoreQuantityOverride
        }
        onResetAll={
          processor
            .resetQuantityOverrides
        }
        onConfirm={
          processor
            .closeAdjustmentModal
        }
      />

      <PrintSettingsModal
        open={
          processor
            .printModalOpen
        }
        records={
          processor.preview
            ?.records ?? []
        }
        disabled={busy}
        onClose={
          processor
            .closePrintModal
        }
        onConfirm={(
          warehouses,
        ) => {
          void processor
            .printWorkbook(
              warehouses,
            );
        }}
      />

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
              hover:text-cyan-300
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
            อ่านข้อมูล PO จาก PDF
            จับคู่สินค้ากับ Excel Template
            และจัดทำใบจัดสินค้าอัตโนมัติ
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
          mt-7
          grid
          gap-4
          lg:grid-cols-[1fr_1fr_0.9fr]
        "
      >
        <FileUploadCard
          kind="pdf"
          title="อัปโหลดไฟล์ PDF"
          description="เลือกไฟล์รายงาน PO จาก CP ALL"
          path={
            processor.pdfPath
          }
          disabled={busy}
          onSelect={() => {
            void processor
              .choosePdf();
          }}
        />

        <LockedTemplateCard
          templatePath={
            processor
              .templatePath
          }
          baseFolder={
            processor
              .baseFolder
          }
        />

        <IvNumberInput
          value={
            processor.startIv
          }
          disabled={busy}
          onChange={
            processor.setStartIv
          }
        />
      </section>

      {processor.error && (
        <div
          className="
            mt-5
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
          <p className="font-medium">
            ไม่สามารถดำเนินการได้
          </p>

          <p className="mt-1 text-xs text-red-200/80">
            {
              processor.error
            }
          </p>
        </div>
      )}

      {processor.success && (
        <div
          className="
            mt-5
            rounded-xl
            border
            border-emerald-300/20
            bg-emerald-300/[0.07]
            px-5
            py-4
            text-sm
            leading-6
            text-emerald-200
          "
        >
          <p className="font-medium">
            {
              processor.success
            }
          </p>

          {processor
            .savedOutputPath && (
            <p
              className="
                mt-1
                break-all
                text-xs
                text-emerald-200/80
              "
            >
              {
                processor
                  .savedOutputPath
              }
            </p>
          )}
        </div>
      )}

      <div
        className="
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
            !processor.canPreview ||
            busy
          }
          onClick={() => {
            void processor
              .buildPreview();
          }}
          className="
            flex
            items-center
            justify-center
            gap-2
            rounded-xl
            border
            border-cyan-300/25
            bg-cyan-300/[0.08]
            px-6
            py-3
            text-sm
            font-medium
            text-cyan-200
            transition
            hover:-translate-y-0.5
            hover:bg-cyan-300/[0.14]
            disabled:cursor-not-allowed
            disabled:opacity-35
          "
        >
          <ScanSearch
            size={18}
          />

          ประมวลผลและแสดง Preview
        </button>

        {processor.preview && (
          <button
            type="button"
            disabled={
              !processor.canExport ||
              busy
            }
            onClick={
              processor
                .openAdjustmentModal
            }
            className="
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-amber-400/40
              bg-amber-400/15
              px-6
              py-3
              text-sm
              font-semibold
              text-amber-700
              shadow-sm
              transition
              hover:-translate-y-0.5
              hover:bg-amber-400/25
              disabled:cursor-not-allowed
              disabled:opacity-35
            "
          >
            <PencilLine
              size={18}
            />

            ตัดยอด
            {processor
              .hasQuantityOverrides && (
              <span
                className="
                  rounded-full
                  bg-amber-600
                  px-2
                  py-0.5
                  text-[10px]
                  text-white
                "
              >
                {
                  Object.keys(
                    processor
                      .quantityOverrides,
                  ).length
                }
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          disabled={
            !processor.canExport ||
            busy
          }
          onClick={() => {
            void processor
              .exportWorkbook();
          }}
          className="
            flex
            items-center
            justify-center
            gap-2
            rounded-xl
            border
            border-emerald-300/30
            bg-emerald-300/10
            px-6
            py-3
            text-sm
            font-medium
            text-emerald-200
            transition
            hover:-translate-y-0.5
            hover:bg-emerald-300/15
            disabled:cursor-not-allowed
            disabled:opacity-35
          "
        >
          <FileCheck2
            size={18}
          />

          บันทึกไฟล์ Excel
        </button>

        {processor.savedFolder && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void processor
                .openSavedFolder();
            }}
            className="
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
            <FolderOpen
              size={18}
            />

            เปิดโฟลเดอร์ที่บันทึก
          </button>
        )}

        {processor.canPrint && (
          <button
            type="button"
            disabled={busy}
            onClick={
              processor
                .openPrintModal
            }
            className="
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-violet-300/25
              bg-violet-300/[0.08]
              px-6
              py-3
              text-sm
              font-medium
              text-violet-200
              transition
              hover:-translate-y-0.5
              hover:bg-violet-300/[0.14]
              disabled:cursor-not-allowed
              disabled:opacity-35
            "
          >
            <Printer
              size={18}
            />

            สั่งพิมพ์
          </button>
        )}
      </div>

      {processor.savedOutputPath && processor.pdfPath && (
        <div
          className="
            mt-5
            flex
            justify-end
          "
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              onNextProcess(
                processor.pdfPath,
              );
            }}
            className="
              flex
              items-center
              justify-center
              gap-3
              rounded-xl
              border
              border-sky-300/35
              bg-gradient-to-r
              from-sky-400/20
              to-cyan-300/10
              px-7
              py-3.5
              text-sm
              font-semibold
              text-sky-100
              shadow-lg
              shadow-sky-500/10
              transition
              hover:-translate-y-0.5
              hover:border-sky-300/55
              hover:from-sky-400/30
              disabled:cursor-not-allowed
              disabled:opacity-35
            "
          >
            <span>Next Process</span>
            <span className="text-sky-300">ลงยอด SO รายวัน</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}

      {processor.preview && (
        <section
          className="
            mt-7
            space-y-5
          "
        >
          <PoProcessingSummary
            result={
              processor.preview
            }
          />

          {processor.preview
            .unused_sheets
            .length > 0 && (
            <div
              className="
                rounded-xl
                border
                border-blue-300/15
                bg-blue-300/[0.05]
                px-5
                py-3
                text-xs
                leading-6
                text-blue-200
              "
            >
              ชีตที่ไม่มีข้อมูล
              และระบบมองข้าม:{" "}
              {
                processor.preview
                  .unused_sheets
                  .join(", ")
              }
            </div>
          )}

          <PoPreviewTable
            records={
              processor.preview
                .records
            }
            quantityOverrides={
              processor
                .quantityOverrides
            }
          />
        </section>
      )}
    </div>
  );
}