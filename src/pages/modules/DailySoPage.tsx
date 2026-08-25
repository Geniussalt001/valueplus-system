import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Ban,
  Boxes,
  CheckCircle2,
  FileCheck2,
  FileSpreadsheet,
  FolderOpen,
  ExternalLink,
  Check,
  LoaderCircle,
  RotateCcw,
  ScanSearch,
  TriangleAlert,
  Upload,
  Warehouse,
  X,
} from "lucide-react";

import {
  dailySoService,
} from "../../services/dailySoService";

import {
  ProcessStatusOverlay,
} from "../../components/common/ProcessStatusOverlay";

import {
  LockedTemplateCard,
} from "../../components/split-rename-po/LockedTemplateCard";

import type {
  DailySoGroup,
  DailySoPaths,
  DailySoProductOption,
  DailySoRecord,
  DailySoResult,
} from "../../types/dailySo.types";

interface DailySoPageProps {
  onBack: () => void;
  initialPdfPath?: string;
  onInitialPdfConsumed?: () => void;
  onNextProcess: (pdfPath: string) => void;
}

type Activity =
  | "idle"
  | "preview"
  | "warehouse"
  | "export";

type QuantityEdits =
  Record<
    string,
    number | ""
  >;

type WarehouseGroupCode =
  | "Q19"
  | "Q20";

type WarehouseAssignments =
  Record<string, WarehouseGroupCode>;

type ProductAssignments =
  Record<string, string>;

const warehouseAssignmentsStorageKey =
  "valueplus.daily-so.warehouse-assignments.v1";

const productAssignmentsStorageKey =
  "valueplus.daily-so.product-assignments.v1";

export function DailySoPage({
  onBack,
  initialPdfPath = "",
  onInitialPdfConsumed,
  onNextProcess,
}: DailySoPageProps) {
  const autoProcessedPdfRef =
    useRef("");

  const [
    paths,
    setPaths,
  ] = useState<
    DailySoPaths | null
  >(
    null,
  );

  const [
    pdfPath,
    setPdfPath,
  ] = useState(
    "",
  );

  const [
    preview,
    setPreview,
  ] = useState<
    DailySoResult | null
  >(
    null,
  );

  const [
    activity,
    setActivity,
  ] = useState<Activity>(
    "idle",
  );

  const [
    error,
    setError,
  ] = useState(
    "",
  );

  const [
    success,
    setSuccess,
  ] = useState(
    "",
  );

  const [
    adjusting,
    setAdjusting,
  ] = useState(
    false,
  );

  const [
    quantityEdits,
    setQuantityEdits,
  ] = useState<QuantityEdits>(
    {},
  );

  const [
    warehouseAssignments,
    setWarehouseAssignments,
  ] = useState<WarehouseAssignments>(
    loadWarehouseAssignments,
  );

  const [
    warehouseDraft,
    setWarehouseDraft,
  ] = useState<WarehouseAssignments>({});

  const [
    warehouseManagerOpen,
    setWarehouseManagerOpen,
  ] = useState(false);

  const [
    productAssignments,
    setProductAssignments,
  ] = useState<ProductAssignments>(
    loadProductAssignments,
  );

  const [
    mappingTarget,
    setMappingTarget,
  ] = useState<DailySoRecord | null>(
    null,
  );

  const busy =
    activity !== "idle";

  const invalidQuantityEdit =
    Object.values(
      quantityEdits,
    ).some(
      (value) => (
        value === "" ||
        !Number.isFinite(
          value,
        ) ||
        value < 0
      ),
    );

  useEffect(() => {
    let active = true;

    void dailySoService
      .getPaths()
      .then((nextPaths) => {
        if (active) {
          setPaths(
            nextPaths,
          );
        }
      })
      .catch((reason) => {
        if (active) {
          setError(
            getErrorMessage(
              reason,
            ),
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        setSuccess("");
      }, 4500);

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [success]);

  useEffect(() => {
    if (!warehouseManagerOpen) {
      return;
    }

    const previousBodyOverflow =
      document.body.style.overflow;
    const previousRootOverflow =
      document.documentElement.style.overflow;

    document.body.style.overflow =
      "hidden";
    document.documentElement.style.overflow =
      "hidden";

    const closeOnEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setWarehouseManagerOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      document.body.style.overflow =
        previousBodyOverflow;
      document.documentElement.style.overflow =
        previousRootOverflow;
      window.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [warehouseManagerOpen]);

  const choosePdf = async () => {
    if (busy) {
      return;
    }

    try {
      setError(
        "",
      );

      setSuccess(
        "",
      );

      const selected =
        await dailySoService
          .selectPdf();

      if (!selected) {
        return;
      }

      setPdfPath(
        selected,
      );

      setPreview(
        null,
      );

      setAdjusting(
        false,
      );

      setQuantityEdits(
        {},
      );

      setWarehouseDraft({});
      setWarehouseManagerOpen(false);
    } catch (reason) {
      setError(
        getErrorMessage(
          reason,
        ),
      );
    }
  };

  const buildPreview = async () => {
    if (
      busy ||
      !paths ||
      !pdfPath
    ) {
      return;
    }

    setActivity(
      "preview",
    );

    setError(
      "",
    );

    setSuccess(
      "",
    );

    try {
      const result =
        await dailySoService
          .preview({
            pdfPath,
            templatePath:
              paths.templatePath,
            warehouseOverrides:
              warehouseAssignments,
            productOverrides:
              productAssignments,
          });

      setPreview(
        result,
      );

      setAdjusting(
        false,
      );

      setQuantityEdits(
        {},
      );
    } catch (reason) {
      setPreview(
        null,
      );

      setError(
        getErrorMessage(
          reason,
        ),
      );
    } finally {
      setActivity(
        "idle",
      );
    }
  };

  const openWarehouseManager = () => {
    if (!preview || busy) {
      return;
    }

    const assignments: WarehouseAssignments = {};

    for (const group of preview.groups) {
      for (const warehouse of group.warehouses) {
        assignments[warehouse] = group.code;
      }
    }

    setWarehouseDraft(assignments);
    setWarehouseManagerOpen(true);
  };

  const saveWarehouseAssignments = async () => {
    if (!preview || !paths || !pdfPath || busy) {
      return;
    }

    setWarehouseManagerOpen(false);
    setActivity("warehouse");
    setError("");
    setSuccess("");

    try {
      const result = await dailySoService.preview({
        pdfPath,
        templatePath: paths.templatePath,
        warehouseOverrides: warehouseDraft,
        productOverrides: productAssignments,
      });

      setPreview(result);
      setWarehouseAssignments(warehouseDraft);
      persistWarehouseAssignments(warehouseDraft);
      setAdjusting(false);
      setQuantityEdits({});
      setSuccess(
        "บันทึกกลุ่มคลังเป็นค่ามาตรฐานแล้ว ระบบจะใช้ค่านี้อัตโนมัติในครั้งถัดไป",
      );
    } catch (reason) {
      setError(getErrorMessage(reason));
      setWarehouseManagerOpen(true);
    } finally {
      setActivity("idle");
    }
  };

  const restoreWarehouseDefaults = async () => {
    if (!preview || !paths || !pdfPath || busy) {
      return;
    }

    setWarehouseManagerOpen(false);
    setActivity("warehouse");
    setError("");
    setSuccess("");

    try {
      const result = await dailySoService.preview({
        pdfPath,
        templatePath: paths.templatePath,
        warehouseOverrides: {},
        productOverrides: productAssignments,
      });

      setPreview(result);
      setWarehouseAssignments({});
      setWarehouseDraft({});
      clearWarehouseAssignments();
      setAdjusting(false);
      setQuantityEdits({});
      setSuccess("คืนค่ากลุ่มคลัง Q19 และ Q20 ตามมาตรฐานแล้ว");
    } catch (reason) {
      setError(getErrorMessage(reason));
      setWarehouseManagerOpen(true);
    } finally {
      setActivity("idle");
    }
  };

  const saveProductAssignment = async (
    target: DailySoRecord,
    itemCode: string,
  ) => {
    if (!paths || !pdfPath || busy || !itemCode) {
      return;
    }

    const nextAssignments: ProductAssignments = {
      ...productAssignments,
      [`name:${target.pdf_name}`]: itemCode,
    };

    for (const barcode of target.barcodes) {
      if (barcode) {
        nextAssignments[`barcode:${barcode}`] = itemCode;
      }
    }

    setMappingTarget(null);
    setActivity("preview");
    setError("");
    setSuccess("");

    try {
      const result = await dailySoService.preview({
        pdfPath,
        templatePath: paths.templatePath,
        warehouseOverrides: warehouseAssignments,
        productOverrides: nextAssignments,
      });

      setProductAssignments(nextAssignments);
      persistProductAssignments(nextAssignments);
      setPreview(result);
      setAdjusting(false);
      setQuantityEdits({});
      setSuccess(
        "บันทึกการจับคู่สินค้าแล้ว ระบบจะจำและใช้อัตโนมัติในครั้งถัดไป",
      );
    } catch (reason) {
      setError(getErrorMessage(reason));
      setMappingTarget(target);
    } finally {
      setActivity("idle");
    }
  };

  useEffect(() => {
    if (
      !initialPdfPath ||
      !paths ||
      autoProcessedPdfRef.current === initialPdfPath
    ) {
      return;
    }

    autoProcessedPdfRef.current = initialPdfPath;
    setPdfPath(initialPdfPath);
    setPreview(null);
    setAdjusting(false);
    setQuantityEdits({});
    setWarehouseDraft({});
    setWarehouseManagerOpen(false);
    setActivity("preview");
    setError("");
    setSuccess(
      "รับไฟล์ PDF จากขั้นตอนออกใบจัดรายวันแล้ว กำลังประมวลผล...",
    );

    void dailySoService
      .preview({
        pdfPath: initialPdfPath,
        templatePath: paths.templatePath,
        warehouseOverrides:
          warehouseAssignments,
        productOverrides:
          productAssignments,
      })
      .then((result) => {
        setPreview(result);
        setSuccess(
          "ประมวลผล PDF จากขั้นตอนออกใบจัดรายวันเรียบร้อยแล้ว",
        );
      })
      .catch((reason) => {
        setPreview(null);
        setSuccess("");
        setError(
          getErrorMessage(reason),
        );
      })
      .finally(() => {
        setActivity("idle");
        onInitialPdfConsumed?.();
      });
  }, [
    initialPdfPath,
    onInitialPdfConsumed,
    paths,
    warehouseAssignments,
    productAssignments,
  ]);

  const exportFiles = async () => {
    if (
      busy ||
      !paths ||
      !pdfPath ||
      !preview ||
      invalidQuantityEdit
    ) {
      return;
    }

    if (preview.error_count > 0) {
      setError(
        getPreviewBlockingMessage(
          preview,
        ),
      );
      return;
    }

    setActivity(
      "export",
    );

    setError(
      "",
    );

    setSuccess(
      "",
    );

    try {
      const quantityOverrides:
        Record<string, number> = {};

      for (
        const [key, value]
        of Object.entries(
          quantityEdits,
        )
      ) {
        if (value !== "") {
          quantityOverrides[key] =
            value;
        }
      }

      const outputFolder =
        await dailySoService
          .getOutputFolder(
            preview.document_date,
          );

      const result =
        await dailySoService
          .process({
            pdfPath,
            templatePath:
              paths.templatePath,
            outputFolder:
              outputFolder,
            quantityOverrides,
            warehouseOverrides:
              warehouseAssignments,
            productOverrides:
              productAssignments,
          });

      setPreview(
        result,
      );

      setSuccess(
        "สร้างไฟล์ Q19 และ Q20 เรียบร้อยแล้ว",
      );

      setAdjusting(
        false,
      );

      setQuantityEdits(
        {},
      );
    } catch (reason) {
      setError(
        getErrorMessage(
          reason,
        ),
      );
    } finally {
      setActivity(
        "idle",
      );
    }
  };

  return (
    <div
      className="
        vp-work-page
        daily-so-workspace
        mx-auto
        max-w-[1600px]
        px-6
        py-8
        lg:px-10
      "
    >
      <ProcessStatusOverlay
        open={busy}
        title={
          activity === "export"
            ? "กำลังสร้างไฟล์ Q19 และ Q20..."
            : activity === "warehouse"
              ? "กำลังจัดกลุ่มคลัง Q19 และ Q20 ใหม่..."
              : "กำลังอ่าน PDF และรวมยอด SO..."
        }
      />

      {warehouseManagerOpen && preview && (
        <WarehouseManagerPopup
          groups={preview.groups}
          assignments={warehouseDraft}
          onChange={(warehouse, groupCode) => {
            setWarehouseDraft((current) => ({
              ...current,
              [warehouse]: groupCode,
            }));
          }}
          onClose={() => {
            setWarehouseManagerOpen(false);
          }}
          onRestore={() => {
            void restoreWarehouseDefaults();
          }}
          onSave={() => {
            void saveWarehouseAssignments();
          }}
        />
      )}
      {mappingTarget && preview && (
        <ProductMappingPopup
          target={mappingTarget}
          products={preview.product_options}
          onClose={() => {
            setMappingTarget(null);
          }}
          onSave={(itemCode) => {
            void saveProductAssignment(
              mappingTarget,
              itemCode,
            );
          }}
        />
      )}
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
            disabled={busy}
            className="
              mb-5
              flex
              items-center
              gap-2
              text-sm
              text-slate-500
              transition
              hover:text-sky-300
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
              text-sky-300
            "
          >
            DAILY SO IMPORT
          </p>

          <h2
            className="
              mt-2
              text-3xl
              font-semibold
              text-white
            "
          >
            ลงยอด SO รายวัน
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
            border-sky-300/20
            bg-sky-300/[0.07]
            text-sky-300
          "
        >
          <FileSpreadsheet
            size={23}
          />
        </div>
      </header>

      <section
        className="
          vp-setup-grid
          mt-7
          grid
          gap-4
          lg:grid-cols-2
        "
      >
        <button
          type="button"
          onClick={() => {
            void choosePdf();
          }}
          disabled={busy}
          className="
            vp-setup-card
            vp-upload-card
            flex
            min-w-0
            items-center
            gap-4
            rounded-2xl
            border
            border-sky-200
            bg-gradient-to-br
            from-white
            via-white
            to-cyan-50
            p-5
            text-left
            shadow-sm
            transition
            hover:-translate-y-0.5
            hover:border-cyan-400
            hover:shadow-lg
            hover:shadow-cyan-100/70
            disabled:opacity-40
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
              border
              border-cyan-200
              bg-cyan-50
              text-sky-600
            "
          >
            <Upload
              size={20}
            />
          </div>

          <div className="min-w-0">
            <p
              className="
                font-medium
                text-slate-900
              "
            >
              อัปโหลดไฟล์ PDF
            </p>

            <p
              className={`
                mt-2
                truncate
                text-xs
                ${
                  pdfPath
                    ? "font-medium text-emerald-600"
                    : "text-slate-400"
                }
              `}
            >
              {
                pdfPath ||
                "เลือกไฟล์ PO จากโฟลเดอร์รายงาน SOรายวัน"
              }
            </p>
          </div>
        </button>

        <LockedTemplateCard
          templatePath={
            paths?.templatePath ?? ""
          }
        />
      </section>

      {error && (
        <MessageBox
          kind="error"
          title="ไม่สามารถดำเนินการได้"
          message={error}
        />
      )}

      {success && (
        <div
          role="status"
          className="
            fixed
            right-6
            top-24
            z-[100]
            w-[min(440px,calc(100vw-3rem))]
            rounded-2xl
            border
            border-emerald-200
            bg-white
            p-4
            shadow-2xl
            shadow-slate-900/15
          "
        >
          <div className="flex items-start gap-3">
            <div
              className="
                mt-0.5
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-emerald-50
                text-emerald-600
              "
            >
              <CheckCircle2 size={19} />
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-slate-900">
                {success}
              </p>

              {preview?.output_paths.length ? (
                <p
                  className="
                    mt-1
                    truncate
                    text-xs
                    text-slate-500
                  "
                  title={
                    preview.output_paths
                      .join(" | ")
                  }
                >
                  {
                    preview.output_paths
                      .join(" | ")
                  }
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div
        className="
          vp-action-bar
          mt-6
          flex
          flex-wrap
          justify-end
          gap-3
        "
      >
        <button
          type="button"
          disabled={
            busy ||
            !pdfPath ||
            !paths
          }
          onClick={() => {
            void buildPreview();
          }}
          className="
            vp-action-button
            vp-action-primary
            flex
            items-center
            gap-2
            rounded-xl
            border
            border-sky-300/25
            bg-sky-300/[0.08]
            px-6
            py-3
            text-sm
            font-medium
            text-sky-200
            transition
            hover:bg-sky-300/[0.14]
            disabled:cursor-not-allowed
            disabled:opacity-35
          "
        >
          {activity ===
          "preview" ? (
            <LoaderCircle
              className="animate-spin"
              size={18}
            />
          ) : (
            <ScanSearch
              size={18}
            />
          )}

          ประมวลผลและแสดง Preview
        </button>

        {preview && (
          <button
            type="button"
            disabled={busy}
            onClick={openWarehouseManager}
            className="vp-action-button flex items-center gap-2 rounded-xl border border-cyan-300 bg-gradient-to-r from-cyan-50 to-blue-50 px-6 py-3 text-sm font-semibold text-cyan-800 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ArrowRightLeft size={18} />
            จัดการคลัง
          </button>
        )}

        <button
          type="button"
          disabled={
            busy ||
            !preview ||
            invalidQuantityEdit
          }
          onClick={() => {
            void exportFiles();
          }}
          className="
            vp-action-button
            vp-action-success
            flex
            items-center
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
            hover:bg-emerald-300/15
            disabled:cursor-not-allowed
            disabled:opacity-35
          "
        >
          {activity ===
          "export" ? (
            <LoaderCircle
              className="animate-spin"
              size={18}
            />
          ) : (
            <FileCheck2
              size={18}
            />
          )}

          บันทึกไฟล์ Q19 และ Q20
        </button>

        {preview?.output_folder && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void dailySoService
                .openFolder(
                  preview
                    .output_folder,
                );
            }}
            className="
              vp-action-button
              vp-action-secondary
              flex
              items-center
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
            "
          >
            <FolderOpen
              size={18}
            />

            เปิดโฟลเดอร์ผลลัพธ์
          </button>
        )}

        {preview &&
          preview.output_paths.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void dailySoService
                .openWms()
                .catch((reason) => {
                  setError(
                    getErrorMessage(
                      reason,
                    ),
                  );
                });
            }}
            className="
              vp-action-button
              vp-action-wms
              flex
              items-center
              gap-2
              rounded-xl
              border
              border-violet-400
              bg-violet-600
              px-6
              py-3
              text-sm
              font-semibold
              text-white
              shadow-lg
              shadow-violet-200/60
              transition
              hover:-translate-y-0.5
              hover:bg-violet-700
              disabled:cursor-not-allowed
              disabled:opacity-35
            "
          >
            <ExternalLink
              size={18}
            />

            เปิด WMS
          </button>
        )}

        {preview &&
          preview.output_paths.length > 0 &&
          pdfPath && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              onNextProcess(
                pdfPath,
              );
            }}
            className="
              vp-next-process
              flex
              items-center
              gap-2
              rounded-xl
              border
              border-cyan-300
              bg-gradient-to-r
              from-cyan-50
              to-sky-50
              px-6
              py-3
              text-sm
              font-semibold
              text-cyan-800
              shadow-lg
              shadow-cyan-200/40
              transition
              hover:-translate-y-0.5
              hover:border-cyan-400
              hover:from-cyan-100
              hover:to-sky-100
              disabled:cursor-not-allowed
              disabled:opacity-35
            "
          >
            Next Process
            <ArrowRight size={18} />
          </button>
        )}
      </div>

      <section className="vp-preview-section mt-7">
        <div
          className="
            mb-4
            flex
            items-center
            justify-between
          "
        >
          <div>
            <p
              className="
                text-[10px]
                font-semibold
                tracking-[0.22em]
                text-slate-500
              "
            >
              PREVIEW
            </p>

            <h3
              className="
                mt-1
                text-xl
                font-semibold
                text-white
              "
            >
              ตรวจสอบข้อมูลก่อนบันทึก
            </h3>
          </div>

          {preview && (
            <div
              className="
                text-right
                text-xs
                text-slate-400
              "
            >
              <p>
                วันที่ PO {preview.document_date}
              </p>

              <p className="mt-1 text-sky-300">
                {preview.po_count} PO · {preview.item_line_count} รายการต้นทาง
              </p>
            </div>
          )}
        </div>

        {!preview ? (
          <div
            className="
              vp-empty-state
              flex
              min-h-[360px]
              flex-col
              items-center
              justify-center
              rounded-2xl
              border
              border-dashed
              border-slate-700
              bg-slate-800/15
              text-slate-600
            "
          >
            <FileSpreadsheet
              size={36}
            />

            <p
              className="
                mt-3
                text-sm
              "
            >
              อัปโหลด PDF แล้วกดประมวลผล
            </p>
          </div>
        ) : (
          <div
            className="
              grid
              items-start
              gap-5
              xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]
            "
          >
            {preview.groups.map(
              (group) => (
                <GroupPreview
                  key={group.code}
                  group={group}
                  documentDate={
                    preview
                      .document_date
                  }
                  adjusting={
                    adjusting
                  }
                  quantityEdits={
                    quantityEdits
                  }
                  onQuantityChange={(
                    key,
                    value,
                  ) => {
                    setQuantityEdits(
                      (current) => ({
                        ...current,
                        [key]: value,
                      }),
                    );
                  }}
                  onQuantityRestore={(
                    key,
                  ) => {
                    setQuantityEdits(
                      (current) => {
                        const next = {
                          ...current,
                        };

                        delete next[key];

                        return next;
                      },
                    );
                  }}
                  onMapProduct={(record) => {
                    setMappingTarget(record);
                  }}
                />
              ),
            )}

            <CombinedResultCard
              groups={preview.groups}
              quantityEdits={
                quantityEdits
              }
            />
          </div>
        )}
      </section>
    </div>
  );
}

function ProductMappingPopup({
  target,
  products,
  onClose,
  onSave,
}: {
  target: DailySoRecord;
  products: DailySoProductOption[];
  onClose: () => void;
  onSave: (itemCode: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    if (!normalizedSearch) {
      return true;
    }

    return `${product.item_code} ${product.item_name}`
      .toLowerCase()
      .includes(normalizedSearch);
  });
  const selectedProduct = products.find(
    (product) => product.item_code === selectedCode,
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="จับคู่สินค้าใหม่"
    >
      <section className="w-full max-w-2xl overflow-hidden rounded-2xl border border-amber-300/25 bg-[#0b1928] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-700/60 p-5">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-300">
              NEW PRODUCT MAPPING
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              พบสินค้าใหม่ — ต้องการลงเป็นสินค้าใดใน DATA?
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:text-white"
            aria-label="ปิด"
          >
            <X size={17} />
          </button>
        </header>

        <div className="space-y-5 p-5">
          <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
            <p className="font-medium text-amber-100">{target.pdf_name}</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
              <span>Barcode: {target.barcodes.join(", ") || "-"}</span>
              <span>ราคา PDF: {formatNumber(target.price)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300" htmlFor="daily-so-product-search">
              ค้นหาด้วยรหัสหรือชื่อสินค้าใน DATA
            </label>
            <input
              id="daily-so-product-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="เช่น 01-0000-39 หรือ อุ้งเท้าแมว"
              autoFocus
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/60"
            />
          </div>

          <select
            size={Math.min(8, Math.max(3, filteredProducts.length))}
            value={selectedCode}
            onChange={(event) => setSelectedCode(event.target.value)}
            className="w-full rounded-xl border border-slate-600 bg-slate-950/60 p-2 text-sm text-slate-200 outline-none focus:border-amber-300/60"
          >
            {filteredProducts.map((product) => (
              <option key={product.item_code} value={product.item_code}>
                {product.item_code} — {product.item_name}
                {product.price === null ? "" : ` — ${formatNumber(product.price)}`}
              </option>
            ))}
          </select>

          {selectedProduct && (
            <p className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 text-xs text-emerald-200">
              ระบบจะจำ Barcode และชื่อ “{target.pdf_name}” ให้ลงเป็น {selectedProduct.item_code} — {selectedProduct.item_name}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-3 border-t border-slate-700/60 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-600 px-5 py-2.5 text-sm text-slate-300 transition hover:text-white"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={!selectedCode}
            onClick={() => onSave(selectedCode)}
            className="rounded-xl border border-emerald-300/30 bg-emerald-400/15 px-5 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-35"
          >
            บันทึกและประมวลผลใหม่
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function WarehouseManagerPopup({
  groups,
  assignments,
  onChange,
  onClose,
  onRestore,
  onSave,
}: {
  groups: DailySoGroup[];
  assignments: WarehouseAssignments;
  onChange: (
    warehouse: string,
    groupCode: WarehouseGroupCode,
  ) => void;
  onClose: () => void;
  onRestore: () => void;
  onSave: () => void;
}) {
  const warehouses = groups.flatMap((group) =>
    group.warehouses.map((warehouse) => ({
      warehouse,
      currentGroup: group.code,
    })),
  );

  const q19Count = warehouses.filter(
    ({ warehouse, currentGroup }) =>
      (assignments[warehouse] ?? currentGroup) === "Q19",
  ).length;
  const q20Count = warehouses.length - q19Count;

  return createPortal(
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="warehouse-manager-title"
      className="fixed inset-0 z-[9999] flex bg-slate-50 p-4 sm:p-6"
    >
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-xl shadow-cyan-100/60">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-cyan-50 via-white to-violet-50 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-200 bg-white text-cyan-700 shadow-sm">
              <ArrowRightLeft size={21} />
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-cyan-700">
                WAREHOUSE MANAGER
              </p>
              <h3
                id="warehouse-manager-title"
                className="mt-1 text-xl font-semibold text-slate-900"
              >
                จัดการคลัง Q19 / Q20
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                ค่าที่บันทึกจะถูกใช้กับไฟล์ครั้งถัดไปโดยอัตโนมัติ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าจัดการคลัง"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <X size={19} />
          </button>
        </div>

        <div className="flex shrink-0 gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3">
          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            Q19 · {q19Count} คลัง
          </span>
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
            Q20 · {q20Count} คลัง
          </span>
        </div>

        <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto overscroll-contain p-6 md:grid-cols-2">
          {warehouses.map(({ warehouse, currentGroup }) => {
            const selected = assignments[warehouse] ?? currentGroup;

            return (
              <div
                key={warehouse}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Warehouse size={19} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {warehouse}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      เลือกว่าจะรวมยอดและบันทึกไว้ในไฟล์ใด
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
                  {(["Q19", "Q20"] as const).map((groupCode) => (
                    <button
                      key={groupCode}
                      type="button"
                      onClick={() => onChange(warehouse, groupCode)}
                      className={`min-w-24 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                        selected === groupCode
                          ? groupCode === "Q19"
                            ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                            : "bg-cyan-600 text-white shadow-md shadow-cyan-200"
                          : "bg-white text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {groupCode}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onRestore}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <RotateCcw size={17} />
            คืนค่ามาตรฐาน
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-200 transition hover:-translate-y-0.5"
          >
            <Check size={18} />
            บันทึกการย้ายคลัง
          </button>
        </div>
      </div>
    </section>,
    document.body,
  );
}

function GroupPreview({
  group,
  documentDate,
  adjusting,
  quantityEdits,
  onQuantityChange,
  onQuantityRestore,
  onMapProduct,
}: {
  group: DailySoGroup;
  documentDate: string;
  adjusting: boolean;
  quantityEdits:
    QuantityEdits;
  onQuantityChange: (
    key: string,
    value: number | "",
  ) => void;
  onQuantityRestore: (
    key: string,
  ) => void;
  onMapProduct: (
    record: DailySoRecord,
  ) => void;
}) {
  const q19 =
    group.code === "Q19";

  const adjustedTotal =
    group.records.reduce(
      (total, record) => {
        const key =
          quantityEditKey(
            group.code,
            record.item_code,
            record.price,
          );

        const editedValue =
          quantityEdits[key];

        return total + (
          typeof editedValue ===
          "number"
            ? editedValue
            : record.quantity
        );
      },
      0,
    );

  return (
    <article
      className={`
        vp-data-card
        min-w-0
        overflow-hidden
        rounded-2xl
        border
        ${
          q19
            ? "border-violet-300/25 bg-violet-300/[0.045]"
            : "border-cyan-300/25 bg-cyan-300/[0.045]"
        }
      `}
    >
      <div
        className="
          border-b
          border-slate-700/60
          p-5
        "
      >
        <div
          className="
            flex
            items-start
            justify-between
            gap-4
          "
        >
          <div>
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <Warehouse
                className={
                  q19
                    ? "text-violet-300"
                    : "text-cyan-300"
                }
                size={19}
              />

              <h4
                className="
                  text-xl
                  font-semibold
                  text-white
                "
              >
                {group.code}
              </h4>
            </div>

            <p
              className="
                mt-2
                text-xs
                leading-5
                text-slate-400
              "
            >
              {group.warehouses.join(" · ")}
            </p>
          </div>

          <div
            className="
              text-right
              text-xs
              text-slate-400
            "
          >
            <p>{group.po_count} PO</p>

            <p className="mt-1 text-emerald-300">
              {formatNumber(adjustedTotal)} ชิ้น
            </p>
          </div>
        </div>

        <p
          className="
            mt-4
            break-words
            rounded-xl
            border
            border-slate-700/50
            bg-slate-950/25
            px-3
            py-2
            text-[11px]
            leading-5
            text-slate-400
          "
        >
          {group.so_text ||
            buildSoText(
              group,
              documentDate,
            )}
        </p>
      </div>

      <div
        className="
          max-h-[560px]
          overflow-auto
        "
      >
        <table
          className="
            w-full
            min-w-[680px]
            text-left
            text-xs
          "
        >
          <thead
            className="
              sticky
              top-0
              z-10
              bg-[#0a1724]
              text-slate-400
            "
          >
            <tr>
              <th className="px-4 py-3">
                รหัสสินค้า
              </th>

              <th className="px-4 py-3">
                รายการสินค้า
              </th>

              <th className="px-4 py-3 text-right">
                จำนวนรวม
              </th>

              <th className="px-4 py-3 text-right">
                ราคา
              </th>

              <th className="px-4 py-3">
                สถานะ
              </th>
            </tr>
          </thead>

          <tbody
            className="
              divide-y
              divide-slate-800
            "
          >
            {group.records.map(
              (record, index) => {
                const editKey =
                  quantityEditKey(
                    group.code,
                    record.item_code,
                    record.price,
                  );

                const editedValue =
                  quantityEdits[
                    editKey
                  ];

                const displayQuantity =
                  editedValue ===
                  undefined
                    ? record.quantity
                    : editedValue;

                const originalQuantity =
                  record.original_quantity ??
                  record.quantity;

                const changed =
                  (
                    typeof editedValue ===
                      "number" &&
                    editedValue !==
                      record.quantity
                  ) ||
                  Boolean(
                    record.adjusted &&
                    originalQuantity !==
                      record.quantity,
                  );

                const removed =
                  displayQuantity === 0 &&
                  (
                    changed ||
                    Boolean(
                      record.adjusted,
                    )
                  );

                return (
                <tr
                  key={`${record.item_code}-${record.pdf_name}-${index}`}
                  className={`
                    align-top
                    text-slate-300
                    transition
                    ${
                      removed
                        ? "bg-red-500/[0.06] opacity-65"
                        : ""
                    }
                  `}
                >
                  <td
                    className="
                      whitespace-nowrap
                      px-4
                      py-3
                      text-sky-300
                    "
                  >
                    {record.item_code || "-"}
                  </td>

                  <td className="px-4 py-3">
                    <p
                      className="
                        font-medium
                        text-slate-200
                      "
                    >
                      {record.item_name || record.pdf_name}
                    </p>

                    {record.message && (
                      <p
                        className="
                          mt-1
                          text-[11px]
                          text-amber-300
                        "
                      >
                        {record.message}
                      </p>
                    )}
                  </td>

                  <td
                    className="
                      px-4
                      py-3
                      text-right
                      text-base
                      font-semibold
                      text-emerald-300
                    "
                  >
                    {adjusting ? (
                      <div
                        className="
                          ml-auto
                          w-28
                        "
                      >
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            displayQuantity
                          }
                          onChange={(event) => {
                            const value =
                              event.target
                                .value;

                            onQuantityChange(
                              editKey,
                              value === ""
                                ? ""
                                : Number(
                                    value,
                                  ),
                            );
                          }}
                          className="
                            w-full
                            rounded-lg
                            border
                            border-amber-300/35
                            bg-slate-950/70
                            px-3
                            py-2
                            text-right
                            text-base
                            font-semibold
                            text-amber-200
                            outline-none
                            focus:border-amber-300/70
                          "
                        />

                        {changed && (
                          <p
                            className="
                              mt-1
                              whitespace-nowrap
                              text-[10px]
                              font-normal
                              text-slate-500
                            "
                          >
                            เดิม {formatNumber(originalQuantity)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span>
                          {
                            formatNumber(
                              typeof displayQuantity ===
                                "number"
                                ? displayQuantity
                                : record.quantity,
                            )
                          }
                        </span>

                        {changed && (
                          <p
                            className="
                              mt-1
                              whitespace-nowrap
                              text-[10px]
                              font-normal
                              text-amber-300
                            "
                          >
                            {
                              removed
                                ? "ตัดรายการแล้ว"
                                : `ตัดจาก ${formatNumber(originalQuantity)}`
                            }
                          </p>
                        )}
                      </div>
                    )}
                  </td>

                  <td
                    className="
                      px-4
                      py-3
                      text-right
                      text-slate-200
                    "
                  >
                    {formatNumber(record.price)}
                  </td>

                  <td className="px-4 py-3">
                    {adjusting ? (
                      <button
                        type="button"
                        title={
                          removed
                            ? "คืนรายการสินค้า"
                            : "ไม่มีการส่งสินค้ารายการนี้"
                        }
                        onClick={() => {
                          if (removed) {
                            if (
                              record.adjusted &&
                              record.original_quantity !==
                                undefined
                            ) {
                              onQuantityChange(
                                editKey,
                                record.original_quantity,
                              );
                            } else {
                              onQuantityRestore(
                                editKey,
                              );
                            }
                          } else {
                            onQuantityChange(
                              editKey,
                              0,
                            );
                          }
                        }}
                        className={`
                          inline-flex
                          h-8
                          items-center
                          justify-center
                          gap-1.5
                          whitespace-nowrap
                          rounded-lg
                          border
                          px-2.5
                          text-[10px]
                          font-semibold
                          leading-none
                          transition
                          ${
                            removed
                              ? "border-sky-400/35 bg-sky-400/10 text-sky-700 hover:bg-sky-400/20"
                              : "border-red-400/35 bg-red-500/10 text-red-600 hover:bg-red-500/20"
                          }
                        `}
                      >
                        {removed ? (
                          <RotateCcw
                            size={12}
                          />
                        ) : (
                          <Ban
                            size={12}
                          />
                        )}

                        {
                          removed
                            ? "คืนรายการ"
                            : "ไม่ส่งสินค้า"
                        }
                      </button>
                    ) : removed ? (
                      <span
                        className="
                          inline-flex
                          items-center
                          gap-2
                          whitespace-nowrap
                          rounded-full
                          border
                          border-red-300/25
                          bg-red-300/[0.08]
                          px-2.5
                          py-1
                          text-[10px]
                          font-semibold
                          text-red-500
                        "
                      >
                        <Ban size={11} />
                        ตัดรายการ
                      </span>
                    ) : record.status === "error" ? (
                      <button
                        type="button"
                        onClick={() => {
                          onMapProduct(record);
                        }}
                        className="
                          inline-flex
                          items-center
                          gap-1.5
                          whitespace-nowrap
                          rounded-lg
                          border
                          border-amber-400/40
                          bg-amber-400/10
                          px-2.5
                          py-1.5
                          text-[10px]
                          font-semibold
                          text-amber-300
                          transition
                          hover:bg-amber-400/20
                        "
                      >
                        <ArrowRightLeft size={12} />
                        จับคู่สินค้า
                      </button>
                    ) : (
                      <StatusBadge
                        status={record.status}
                      />
                    )}
                  </td>
                </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>

      <div
        className="
          flex
          flex-wrap
          items-center
          justify-between
          gap-3
          border-t
          border-slate-700/60
          px-5
          py-4
          text-xs
          text-slate-400
        "
      >
        <span>{group.output_name}</span>

        <span>
          พร้อม {group.ready_count} · ตรวจสอบ {group.review_count} · ผิดพลาด {group.error_count}
        </span>
      </div>
    </article>
  );
}

interface CombinedProduct {
  key: string;
  itemName: string;
  itemCode: string;
  q19: number;
  q20: number;
  total: number;
}

function CombinedResultCard({
  groups,
  quantityEdits,
}: {
  groups: DailySoGroup[];
  quantityEdits:
    QuantityEdits;
}) {
  const products =
    new Map<
      string,
      CombinedProduct
    >();

  const groupTotals = {
    Q19: 0,
    Q20: 0,
  };

  for (const group of groups) {
    for (const record of group.records) {
      const editKey =
        quantityEditKey(
          group.code,
          record.item_code,
          record.price,
        );

      const editedValue =
        quantityEdits[
          editKey
        ];

      const quantity =
        typeof editedValue ===
          "number"
          ? editedValue
          : record.quantity;

      groupTotals[group.code] +=
        quantity;

      const productKey =
        record.item_code ||
        record.pdf_name;

      const current =
        products.get(
          productKey,
        ) ?? {
          key: productKey,
          itemName:
            record.item_name ||
            record.pdf_name,
          itemCode:
            record.item_code,
          q19: 0,
          q20: 0,
          total: 0,
        };

      if (group.code === "Q19") {
        current.q19 += quantity;
      } else {
        current.q20 += quantity;
      }

      current.total += quantity;

      products.set(
        productKey,
        current,
      );
    }
  }

  const combinedProducts =
    Array.from(
      products.values(),
    )
      .filter(
        (product) =>
          product.total > 0,
      )
      .sort(
        (left, right) =>
          right.total -
          left.total,
      );

  const grandTotal =
    groupTotals.Q19 +
    groupTotals.Q20;

  return (
    <aside
      className="
        sticky
        top-6
        min-w-0
        overflow-hidden
        rounded-2xl
        border
        border-cyan-300/30
        bg-[#062f46]
        text-white
        shadow-xl
        shadow-cyan-950/15
      "
    >
      <div
        className="
          border-b
          border-white/10
          bg-gradient-to-br
          from-cyan-400/15
          to-blue-500/10
          p-5
        "
      >
        <div
          className="
            flex
            items-start
            justify-between
            gap-3
          "
        >
          <div>
            <p
              className="
                text-[10px]
                font-semibold
                tracking-[0.2em]
                text-cyan-200
              "
            >
              COMBINED RESULT
            </p>

            <h4
              className="
                mt-2
                text-xl
                font-semibold
                text-white
              "
            >
              ผลลัพธ์รวม Q19 + Q20
            </h4>
          </div>

          <Boxes
            className="
              text-cyan-200
            "
            size={22}
          />
        </div>

        <div
          className="
            mt-5
            grid
            grid-cols-2
            gap-2
          "
        >
          <ResultMetric
            label="ยอด Q19"
            value={
              groupTotals.Q19
            }
            tone="violet"
          />

          <ResultMetric
            label="ยอด Q20"
            value={
              groupTotals.Q20
            }
            tone="cyan"
          />
        </div>

        <div
          className="
            mt-2
            rounded-xl
            border
            border-emerald-300/30
            bg-emerald-300/10
            px-4
            py-3
          "
        >
          <p
            className="
              text-[10px]
              font-medium
              text-emerald-100/80
            "
          >
            ยอดรวมทั้ง 2 คลัง
          </p>

          <p
            className="
              mt-1
              text-2xl
              font-bold
              text-emerald-200
            "
          >
            {formatNumber(grandTotal)}
            <span
              className="
                ml-1
                text-xs
                font-medium
              "
            >
              ชิ้น
            </span>
          </p>
        </div>
      </div>

      <div
        className="
          flex
          items-center
          justify-between
          border-b
          border-white/10
          px-5
          py-3
        "
      >
        <p
          className="
            text-xs
            font-semibold
            text-white
          "
        >
          รวมตามรายการสินค้า
        </p>

        <span
          className="
            rounded-full
            border
            border-cyan-200/20
            px-2
            py-1
            text-[9px]
            text-cyan-100
          "
        >
          {combinedProducts.length} รายการ
        </span>
      </div>

      <div
        className="
          max-h-[470px]
          space-y-2
          overflow-auto
          p-3
        "
      >
        {combinedProducts.map(
          (product) => (
            <div
              key={product.key}
              className="
                rounded-xl
                border
                border-white/10
                bg-white/[0.06]
                px-3
                py-3
              "
            >
              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-3
                "
              >
                <div className="min-w-0">
                  <p
                    className="
                      truncate
                      text-xs
                      font-medium
                      text-white
                    "
                    title={
                      product.itemName
                    }
                  >
                    {product.itemName}
                  </p>

                  <p
                    className="
                      mt-1
                      text-[9px]
                      text-slate-300
                    "
                  >
                    {product.itemCode || "-"}
                  </p>
                </div>

                <p
                  className="
                    shrink-0
                    text-sm
                    font-bold
                    text-emerald-200
                  "
                >
                  {
                    formatNumber(
                      product.total,
                    )
                  }
                </p>
              </div>

              <div
                className="
                  mt-2
                  flex
                  gap-3
                  text-[9px]
                  text-slate-300
                "
              >
                <span>
                  Q19 {formatNumber(product.q19)}
                </span>

                <span>
                  Q20 {formatNumber(product.q20)}
                </span>
              </div>
            </div>
          ),
        )}

        {combinedProducts.length ===
          0 && (
          <div
            className="
              rounded-xl
              border
              border-dashed
              border-white/15
              px-4
              py-8
              text-center
              text-xs
              text-slate-300
            "
          >
            ไม่มีรายการที่มียอดส่งสินค้า
          </div>
        )}
      </div>
    </aside>
  );
}

function ResultMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone:
    "violet" | "cyan";
}) {
  const toneClass =
    tone === "violet"
      ? "border-violet-300/25 bg-violet-300/10 text-violet-100"
      : "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";

  return (
    <div
      className={`
        rounded-xl
        border
        px-3
        py-3
        ${toneClass}
      `}
    >
      <p
        className="
          text-[9px]
          opacity-75
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          text-lg
          font-bold
        "
      >
        {formatNumber(value)}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    "ready" | "review" | "error";
}) {
  const label =
    status === "ready"
      ? "พร้อม"
      : status === "review"
        ? "ตรวจสอบราคา"
        : "ผิดพลาด";

  const className =
    status === "ready"
      ? "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-300"
      : status === "review"
        ? "border-amber-300/20 bg-amber-300/[0.08] text-amber-300"
        : "border-red-300/20 bg-red-300/[0.08] text-red-300";

  const statusClass =
    status === "ready"
      ? "status-success"
      : status === "review"
        ? "status-waiting"
        : "status-error";

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-2
        whitespace-nowrap
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        ${className}
      `}
    >
      <span
        className={`status-light ${statusClass}`}
        aria-hidden="true"
      />

      {label}
    </span>
  );
}

function MessageBox({
  kind,
  title,
  message,
}: {
  kind: "error" | "success";
  title: string;
  message: string;
}) {
  const success =
    kind === "success";

  return (
    <div
      className={`
        mt-5
        flex
        items-start
        gap-3
        rounded-xl
        border
        px-5
        py-4
        text-sm
        ${
          success
            ? "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200"
            : "border-red-300/20 bg-red-300/[0.07] text-red-200"
        }
      `}
    >
      {success ? (
        <CheckCircle2
          className="mt-0.5 shrink-0"
          size={18}
        />
      ) : (
        <TriangleAlert
          className="mt-0.5 shrink-0"
          size={18}
        />
      )}

      <div className="min-w-0">
        <p className="font-medium">
          {title}
        </p>

        {message && (
          <p
            className="
              mt-1
              break-all
              text-xs
              opacity-80
            "
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

function loadWarehouseAssignments(): WarehouseAssignments {
  try {
    const storedValue =
      window.localStorage.getItem(
        warehouseAssignmentsStorageKey,
      );

    if (!storedValue) {
      return {};
    }

    const parsed: unknown =
      JSON.parse(storedValue);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    const assignments: WarehouseAssignments = {};

    for (const [warehouse, groupCode]
      of Object.entries(parsed)) {
      const normalizedWarehouse =
        warehouse.trim();

      if (
        normalizedWarehouse &&
        (groupCode === "Q19" || groupCode === "Q20")
      ) {
        assignments[normalizedWarehouse] = groupCode;
      }
    }

    return assignments;
  } catch {
    return {};
  }
}

function persistWarehouseAssignments(
  assignments: WarehouseAssignments,
): void {
  window.localStorage.setItem(
    warehouseAssignmentsStorageKey,
    JSON.stringify(assignments),
  );
}

function clearWarehouseAssignments(): void {
  window.localStorage.removeItem(
    warehouseAssignmentsStorageKey,
  );
}

function loadProductAssignments(): ProductAssignments {
  try {
    const storedValue = window.localStorage.getItem(
      productAssignmentsStorageKey,
    );

    if (!storedValue) {
      return {};
    }

    const parsed: unknown = JSON.parse(storedValue);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const assignments: ProductAssignments = {};

    for (const [key, itemCode] of Object.entries(parsed)) {
      if (
        (key.startsWith("barcode:") || key.startsWith("name:")) &&
        typeof itemCode === "string" &&
        itemCode.trim()
      ) {
        assignments[key] = itemCode.trim();
      }
    }

    return assignments;
  } catch {
    return {};
  }
}

function persistProductAssignments(
  assignments: ProductAssignments,
): void {
  window.localStorage.setItem(
    productAssignmentsStorageKey,
    JSON.stringify(assignments),
  );
}

function quantityEditKey(
  groupCode: string,
  itemCode: string,
  price: number,
): string {
  return `${groupCode}|${itemCode}|${price}`;
}

const numberFormatter =
  new Intl.NumberFormat(
    "th-TH",
    {
      maximumFractionDigits: 2,
    },
  );

function formatNumber(
  value: number,
): string {
  return numberFormatter.format(
    value,
  );
}

function buildSoText(
  group: DailySoGroup,
  documentDate: string,
): string {
  return `${group.code} รวม ${group.po_count} PO ${formatCompactDocumentDate(
    documentDate,
  )}`;
}

function formatCompactDocumentDate(
  value: string,
): string {
  const parts = String(
    value || "",
  )
    .trim()
    .split(/[./-]/)
    .filter(Boolean);

  if (parts.length !== 3) {
    return value;
  }

  const yearFirst =
    parts[0].length === 4;

  const day = Number(
    yearFirst
      ? parts[2]
      : parts[0],
  );

  const month = Number(
    parts[1],
  );

  let year = Number(
    yearFirst
      ? parts[0]
      : parts[2],
  );

  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year)
  ) {
    return value;
  }

  if (year >= 2400) {
    year -= 543;
  }

  return `${day}/${month}/${String(
    year % 100,
  ).padStart(2, "0")}`;
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

function getPreviewBlockingMessage(
  result: DailySoResult,
): string {
  const details = [
    ...result.unknown_warehouses.map(
      (warehouse) =>
        `ไม่รู้จักคลัง ${warehouse}`,
    ),
    ...result.groups.flatMap(
      (group) =>
        group.records
          .filter(
            (record) =>
              record.status === "error",
          )
          .map(
            (record) =>
              `${group.code}: ${record.pdf_name || "ไม่ทราบชื่อสินค้า"} — ${record.message}`,
          ),
    ),
  ];

  const summary = details
    .slice(0, 5)
    .join(" · ");

  return summary
    ? `ยังบันทึกไม่ได้ กรุณาตรวจสอบรายการต่อไปนี้: ${summary}`
    : "ยังบันทึกไม่ได้ เนื่องจาก Preview มีรายการผิดพลาด กรุณาตรวจสอบรายการสีแดง";
}
