import {
  invoke,
} from "@tauri-apps/api/core";

import {
  desktopDir,
  join,
} from "@tauri-apps/api/path";

import {
  open,
} from "@tauri-apps/plugin-dialog";

import {
  openPath,
} from "@tauri-apps/plugin-opener";

import type {
  PdfSplitInput,
  PdfSplitResult,
} from "../types/pdfSplitter.types";

const outputFolderName =
  "Po Cpall";

const pdfFilter = [
  {
    name:
      "PDF Document",

    extensions: [
      "pdf",
    ],
  },
];

export const pdfSplitterService = {
  async getOutputBase():
    Promise<string>
  {
    const desktopPath =
      await desktopDir();

    return join(
      desktopPath,
      outputFolderName,
    );
  },

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

  async process(
    input: PdfSplitInput,
  ): Promise<PdfSplitResult> {
    return invoke<
      PdfSplitResult
    >(
      "split_po_pdf",
      {
        input,
      },
    );
  },

  async openFolder(
    folderPath: string,
  ): Promise<void> {
    if (!folderPath) {
      throw new Error(
        "ไม่พบโฟลเดอร์ที่บันทึก",
      );
    }

    await openPath(
      folderPath,
    );
  },
};
