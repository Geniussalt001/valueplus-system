import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  ClipboardList,
  FileCheck2,
  FolderOpen,
  PencilLine,
  Printer,
  ScanSearch,
  PackagePlus,
} from "lucide-react";

import {
  ProductSetupModal,
} from "../../components/split-rename-po/ProductSetupModal";
import type {
  ProductSetupForm,
} from "../../components/split-rename-po/ProductSetupModal";
import type { PoProductMatch } from "../../types/poProcessor.types";
import { dailySoService } from "../../services/dailySoService";
import { salesBillingService } from "../../services/salesBillingService";
import { productCatalogService } from "../../services/productCatalogService";

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

import {
  showAppToast,
} from "../../services/appToast";

interface SplitRenamePoPageProps {
  onBack: () => void;
  onNextProcess: (
    pdfPath: string,
    startIvNumber: string,
  ) => void;
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
  const [setupItem, setSetupItem] = useState<PoProductMatch | null>(null);
  const [savingSetup, setSavingSetup] = useState(false);

  const previewProducts = useMemo(() => {
    const products = new Map<string, PoProductMatch>();
    for (const record of processor.preview?.records ?? []) {
      for (const item of record.items) {
        const key = `${item.barcode}|${item.pdf_name}`;
        const current = products.get(key);
        if (!current || (!item.matched && current.matched)) {
          products.set(key, item);
        }
      }
    }
    return Array.from(products.values());
  }, [processor.preview]);

  async function saveProductSetup(form: ProductSetupForm) {
    if (!setupItem || savingSetup) return;
    setSavingSetup(true);
    try {
      const price = form.price.trim() ? Number(form.price) : undefined;
      if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
        throw new Error("ราคาสินค้าไม่ถูกต้อง");
      }

      const catalog = await productCatalogService.list();
      const existing = catalog.find(
        (product) => product.product_code === form.expressCode,
      );
      if (
        existing &&
        existing.display_name.trim() !== form.displayName.trim() &&
        !window.confirm(
          `รหัส ${form.expressCode} มีสินค้า “${existing.display_name}” อยู่แล้ว\n\nต้องการเปลี่ยนชื่อเป็น “${form.displayName.trim()}” และใช้กับสินค้านี้หรือไม่?`,
        )
      ) {
        return;
      }

      await processor.validateProductAssignment(
        setupItem,
        form.templateName,
      );

      const soPaths = await dailySoService.getPaths();

      await dailySoService.setupProduct({
        templatePath: soPaths.templatePath,
        itemCode: form.expressCode,
        itemName: form.displayName.trim(),
        price,
      });

      await salesBillingService.saveProductMapping({
        cpallCode: form.cpallCode,
        barcode: setupItem.barcode.length === 13 ? setupItem.barcode : "",
        pdfName: setupItem.pdf_name,
        expressCode: form.expressCode,
      });

      if (existing) {
        await productCatalogService.update({
          productCode: form.expressCode,
          displayName: form.displayName.trim(),
          lineName: form.lineName.trim(),
          displayOrder: existing.display_order,
        });
        if (!existing.active) {
          await productCatalogService.setActive(
            form.expressCode,
            true,
          );
        }
      } else {
        await productCatalogService.create({
          productCode: form.expressCode,
          displayName: form.displayName.trim(),
          lineName: form.lineName.trim(),
          active: true,
        });
      }

      persistDailySoAssignment(
        setupItem,
        form.cpallCode,
        form.expressCode,
      );
      await processor.saveProductAssignment(
        setupItem,
        form.templateName,
      );
      setSetupItem(null);
      showAppToast({
        tone: "success",
        title: "ตั้งค่าสินค้าใหม่เรียบร้อยแล้ว",
        message: `${form.expressCode} — ${form.displayName}`,
      });
    } catch (reason) {
      showAppToast({
        tone: "error",
        title: "ตั้งค่าสินค้าไม่สำเร็จ",
        message: String(reason),
      });
    } finally {
      setSavingSetup(false);
    }
  }

  useEffect(() => {
    if (!processor.success) {
      return;
    }

    showAppToast({
      tone: "success",
      title: processor.success,
      message:
        processor.savedOutputPath || undefined,
    });
  }, [
    processor.savedOutputPath,
    processor.success,
  ]);

  return (
    <div
      className="
        vp-work-page
        daily-picking-workspace
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

      <ProductSetupModal
        item={setupItem}
        productNames={(processor.preview?.product_options ?? []).map((item) => item.name)}
        saving={savingSetup}
        onClose={() => setSetupItem(null)}
        onSave={(form) => { void saveProductSetup(form); }}
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
            DAILY PICKING
          </p>

          <h2
            className="
              mt-2
              text-3xl
              font-semibold
              text-white
            "
          >
            ออกใบจัดรายวัน
          </h2>

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
          <ClipboardList size={23} />
        </div>
      </header>

      <section
        className="
          vp-setup-grid
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
            !processor.canPreview ||
            busy
          }
          onClick={() => {
            void processor
              .buildPreview();
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
              vp-action-button
              vp-action-warning
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
              className="daily-picking-adjust-icon"
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
            vp-action-button
            vp-action-success
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
              vp-action-button
              vp-action-secondary
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
                processor.startIv,
              );
            }}
            className="
              vp-next-process
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
            vp-preview-section
            mt-7
            space-y-5
          "
        >
          <PoProcessingSummary
            result={
              processor.preview
            }
          />

          {previewProducts.length > 0 && (
            <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-slate-800">
              <div className="flex items-center gap-3">
                <PackagePlus className="text-amber-600" size={22} />
                <div>
                  <h3 className="font-semibold">ตั้งค่าสินค้าและรหัส Express</h3>
                  <p className="mt-1 text-xs text-slate-600">เลือกสินค้าใหม่เพื่อตั้งชื่อและรหัส Express ครั้งเดียว สินค้าที่รอตรวจสอบต้องตั้งค่าให้ครบก่อนสร้างไฟล์</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {previewProducts.map((item) => (
                  <button key={`${item.barcode}|${item.pdf_name}`} type="button" disabled={busy} onClick={() => setSetupItem(item)} className="flex items-center justify-between rounded-xl border border-amber-200 bg-white p-4 text-left hover:border-amber-400 disabled:opacity-50">
                    <span><span className="block text-sm font-semibold">{item.pdf_name}</span><span className="mt-1 block text-xs text-slate-500">CPALL/Barcode {item.barcode || "-"} • {item.matched ? "จับคู่ใบจัดแล้ว" : "รอตรวจสอบ"}</span></span>
                    <span className={`rounded-lg px-3 py-2 text-xs font-semibold text-white ${item.matched ? "bg-cyan-600" : "bg-amber-500"}`}>{item.matched ? "ตั้งค่า Express" : "ตั้งค่าสินค้า"}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

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

function persistDailySoAssignment(
  item: PoProductMatch,
  cpallCode: string,
  expressCode: string,
) {
  const key = "valueplus.daily-so.product-assignments.v1";
  let assignments: Record<string, string> = {};
  try {
    const saved = window.localStorage.getItem(key);
    if (saved) assignments = JSON.parse(saved) as Record<string, string>;
  } catch {
    assignments = {};
  }
  assignments[`name:${item.pdf_name}`] = expressCode;
  if (item.barcode) assignments[`barcode:${item.barcode}`] = expressCode;
  if (cpallCode) assignments[`barcode:${cpallCode}`] = expressCode;
  window.localStorage.setItem(key, JSON.stringify(assignments));
}
