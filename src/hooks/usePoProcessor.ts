import { useEffect, useMemo, useState } from "react";

import { poProcessorService } from "../services/poProcessorService";

import type { PoPreviewResult } from "../types/poProcessor.types";
import type { WarehousePrintRequest } from "../types/print.types";

export type ProcessorActivity =
  | "idle"
  | "selecting"
  | "previewing"
  | "exporting"
  | "printing";

export function usePoProcessor() {
  const [pdfPath, setPdfPath] = useState("");
  const [templatePath, setTemplatePath] = useState("");
  const [baseFolder, setBaseFolder] = useState("");
  const [startIv, setStartIvValue] = useState("");

  const [preview, setPreview] =
    useState<PoPreviewResult | null>(null);

  const [activity, setActivity] =
    useState<ProcessorActivity>("idle");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [savedFolder, setSavedFolder] = useState("");
  const [savedOutputPath, setSavedOutputPath] = useState("");

  const [printModalOpen, setPrintModalOpen] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function loadPaths() {
      try {
        const paths =
          await poProcessorService.getDailyPickingPaths();

        if (!active) {
          return;
        }

        setTemplatePath(paths.templatePath);
        setBaseFolder(paths.baseFolder);
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(getErrorMessage(requestError));
      }
    }

    void loadPaths();

    return () => {
      active = false;
    };
  }, []);

  const canPreview = useMemo(() => {
    return Boolean(
      pdfPath &&
        templatePath &&
        /^\d+$/.test(startIv),
    );
  }, [pdfPath, templatePath, startIv]);

  const canExport = Boolean(
    preview &&
      preview.records.length > 0 &&
      preview.review_count === 0 &&
      preview.error_count === 0,
  );

  const canPrint = Boolean(
    savedOutputPath &&
      preview &&
      preview.records.length > 0,
  );

  function clearResult() {
    setPreview(null);
    setError("");
    setSuccess("");
    setSavedFolder("");
    setSavedOutputPath("");
    setPrintModalOpen(false);
  }

  async function choosePdf() {
    setActivity("selecting");
    setError("");

    try {
      const path =
        await poProcessorService.selectPdf();

      if (path) {
        setPdfPath(path);
        clearResult();
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActivity("idle");
    }
  }

  function setStartIv(value: string) {
    setStartIvValue(
      value.replace(/\D/g, ""),
    );

    clearResult();
  }

  async function buildPreview() {
    if (!canPreview) {
      return;
    }

    setActivity("previewing");
    setError("");
    setSuccess("");
    setSavedFolder("");
    setSavedOutputPath("");
    setPrintModalOpen(false);

    try {
      const result =
        await poProcessorService.preview({
          pdfPath,
          templatePath,
          startIv,
        });

      setPreview(result);
    } catch (requestError) {
      setPreview(null);
      setError(getErrorMessage(requestError));
    } finally {
      setActivity("idle");
    }
  }

  async function exportWorkbook() {
    if (!canExport || !preview) {
      return;
    }

    setActivity("exporting");
    setError("");
    setSuccess("");
    setPrintModalOpen(false);

    try {
      const documentDate =
        getSingleDocumentDate(preview);

      const paths =
        await poProcessorService.getDailyPickingPaths(
          documentDate,
        );

      const result =
        await poProcessorService.process({
          pdfPath,
          templatePath,
          startIv,
          outputPath: paths.outputPath,
        });

      setPreview(result);
      setSavedFolder(paths.outputFolder);

      setSavedOutputPath(
        result.output_path ?? paths.outputPath,
      );

      setSuccess(
        "บันทึกไฟล์ Excel เรียบร้อยแล้ว",
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActivity("idle");
    }
  }

  async function openSavedFolder() {
    if (!savedFolder) {
      return;
    }

    setError("");

    try {
      await poProcessorService.openFolder(
        savedFolder,
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  function openPrintModal() {
    if (!canPrint) {
      return;
    }

    setError("");
    setPrintModalOpen(true);
  }

  function closePrintModal() {
    if (activity === "printing") {
      return;
    }

    setPrintModalOpen(false);
  }

  async function printWorkbook(
    warehouses: WarehousePrintRequest[],
  ) {
    if (
      !canPrint ||
      !savedOutputPath ||
      warehouses.length === 0
    ) {
      return;
    }

    setPrintModalOpen(false);
    setActivity("printing");
    setError("");
    setSuccess("");

    try {
      await poProcessorService.printWorkbook({
        workbookPath: savedOutputPath,
        warehouses,
      });

      setSuccess(
        "เสร็จสิ้นขั้นตอนการพิมพ์เอกสาร",
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActivity("idle");
    }
  }

  return {
    pdfPath,
    templatePath,
    baseFolder,
    startIv,
    preview,
    activity,
    error,
    success,
    savedFolder,
    savedOutputPath,
    printModalOpen,
    canPreview,
    canExport,
    canPrint,
    choosePdf,
    setStartIv,
    buildPreview,
    exportWorkbook,
    openSavedFolder,
    openPrintModal,
    closePrintModal,
    printWorkbook,
  };
}

function getSingleDocumentDate(
  preview: PoPreviewResult,
): string {
  const dates = new Set(
    preview.records
      .map((record) => record.document_date)
      .filter(Boolean),
  );

  if (dates.size === 0) {
    throw new Error(
      "ไม่พบวันที่เอกสารใน PDF",
    );
  }

  if (dates.size > 1) {
    throw new Error(
      "พบวันที่เอกสารมากกว่า 1 วัน กรุณาแยกไฟล์ PDF ก่อนดำเนินการ",
    );
  }

  return Array.from(dates)[0];
}

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}