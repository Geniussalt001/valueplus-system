import {
  useMemo,
  useState,
} from "react";

import {
  poProcessorService,
} from "../services/poProcessorService";

import type {
  PoPreviewResult,
} from "../types/poProcessor.types";

export type ProcessorActivity =
  | "idle"
  | "selecting"
  | "previewing"
  | "exporting";

export function usePoProcessor() {
  const [
    pdfPath,
    setPdfPath,
  ] = useState("");

  const [
    templatePath,
    setTemplatePath,
  ] = useState("");

  const [
    startIv,
    setStartIvValue,
  ] = useState("");

  const [
    preview,
    setPreview,
  ] =
    useState<
      PoPreviewResult | null
    >(null);

  const [
    activity,
    setActivity,
  ] =
    useState<
      ProcessorActivity
    >("idle");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const canPreview =
    useMemo(
      () => {
        return Boolean(
          pdfPath &&
            templatePath &&
            /^\d+$/.test(
              startIv,
            ),
        );
      },
      [
        pdfPath,
        templatePath,
        startIv,
      ],
    );

  const canExport =
    Boolean(
      preview &&
        preview.review_count ===
          0 &&
        preview.error_count ===
          0,
    );

  const clearResult = () => {
    setPreview(null);
    setError("");
    setSuccess("");
  };

  const choosePdf =
    async () => {
      setActivity(
        "selecting",
      );

      setError("");

      try {
        const path =
          await poProcessorService
            .selectPdf();

        if (path) {
          setPdfPath(
            path,
          );

          clearResult();
        }
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setActivity(
          "idle",
        );
      }
    };

  const chooseTemplate =
    async () => {
      setActivity(
        "selecting",
      );

      setError("");

      try {
        const path =
          await poProcessorService
            .selectTemplate();

        if (path) {
          setTemplatePath(
            path,
          );

          clearResult();
        }
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setActivity(
          "idle",
        );
      }
    };

  const setStartIv = (
    value: string,
  ) => {
    const numberOnly =
      value.replace(
        /\D/g,
        "",
      );

    setStartIvValue(
      numberOnly,
    );

    clearResult();
  };

  const buildPreview =
    async () => {
      if (!canPreview) {
        return;
      }

      setActivity(
        "previewing",
      );

      setError("");
      setSuccess("");

      try {
        const result =
          await poProcessorService
            .preview({
              pdfPath,
              templatePath,
              startIv,
            });

        setPreview(
          result,
        );
      } catch (
        requestError
      ) {
        setPreview(null);

        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setActivity(
          "idle",
        );
      }
    };

  const exportWorkbook =
    async () => {
      if (!canExport) {
        return;
      }

      setActivity(
        "exporting",
      );

      setError("");
      setSuccess("");

      try {
        const outputPath =
          await poProcessorService
            .selectOutputPath();

        if (!outputPath) {
          return;
        }

        const result =
          await poProcessorService
            .process({
              pdfPath,
              templatePath,
              startIv,
              outputPath,
            });

        setPreview(
          result,
        );

        setSuccess(
          `สร้างไฟล์สำเร็จ: ${
            result.output_path ??
            outputPath
          }`,
        );
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setActivity(
          "idle",
        );
      }
    };

  return {
    pdfPath,
    templatePath,
    startIv,
    preview,
    activity,
    error,
    success,
    canPreview,
    canExport,
    choosePdf,
    chooseTemplate,
    setStartIv,
    buildPreview,
    exportWorkbook,
  };
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return String(
    error,
  );
}