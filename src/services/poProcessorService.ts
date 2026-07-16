import {
  invoke,
} from "@tauri-apps/api/core";

import {
  open,
  save,
} from "@tauri-apps/plugin-dialog";

import type {
  PoPreviewResult,
  PoProcessorInput,
} from "../types/poProcessor.types";

const pdfFilter = [
  {
    name: "PDF Document",
    extensions: [
      "pdf",
    ],
  },
];

const excelFilter = [
  {
    name: "Excel Workbook",
    extensions: [
      "xlsx",
    ],
  },
];

export const poProcessorService = {
  async selectPdf():
    Promise<string | null>
  {
    const selected =
      await open({
        multiple: false,
        directory: false,
        filters: pdfFilter,
      });

    return typeof selected ===
      "string"
      ? selected
      : null;
  },

  async selectTemplate():
    Promise<string | null>
  {
    const selected =
      await open({
        multiple: false,
        directory: false,
        filters: excelFilter,
      });

    return typeof selected ===
      "string"
      ? selected
      : null;
  },

  async selectOutputPath():
    Promise<string | null>
  {
    const selected =
      await save({
        defaultPath:
          "ใบจัดสินค้า_ผลลัพธ์.xlsx",

        filters:
          excelFilter,
      });

    return selected ?? null;
  },

  async preview(
    input:
      PoProcessorInput,
  ): Promise<PoPreviewResult> {
    return invoke<
      PoPreviewResult
    >(
      "preview_po_documents",
      {
        input,
      },
    );
  },

  async process(
    input:
      PoProcessorInput,
  ): Promise<PoPreviewResult> {
    return invoke<
      PoPreviewResult
    >(
      "process_po_documents",
      {
        input,
      },
    );
  },
};