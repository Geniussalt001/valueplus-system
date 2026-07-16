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
  DailyPickingPaths,
  PoPreviewResult,
  PoProcessorInput,
} from "../types/poProcessor.types";

import type {
  PrintWorkbookInput,
} from "../types/print.types";

const reportFolderName =
  "รายงานใบจัดรายวัน";

const templateFileName =
  "Templete ใบจัดสินค้า-Seven Eleven (ภายใน).xlsx";

const outputFilePrefix =
  "ใบจัดสินค้า-Seven Eleven (ภายใน)";

const pdfFilter = [
  {
    name:
      "PDF Document",

    extensions: [
      "pdf",
    ],
  },
];

export const poProcessorService = {
  async getDailyPickingPaths(
    documentDate = "",
  ): Promise<DailyPickingPaths> {
    const desktopPath =
      await desktopDir();

    const baseFolder =
      await join(
        desktopPath,
        reportFolderName,
      );

    const templatePath =
      await join(
        baseFolder,
        templateFileName,
      );

    if (!documentDate) {
      return {
        desktopPath,
        baseFolder,
        templatePath,
        outputFolder:
          baseFolder,
        outputPath: "",
      };
    }

    const parsedDate =
      parseDocumentDate(
        documentDate,
      );

    const yearFolder =
      String(
        parsedDate.year,
      );

    const monthFolder =
      String(
        parsedDate.month,
      ).padStart(
        2,
        "0",
      );

    const outputFolder =
      await join(
        baseFolder,
        yearFolder,
        monthFolder,
      );

    const formattedDate =
      [
        String(
          parsedDate.day,
        ).padStart(
          2,
          "0",
        ),

        monthFolder,

        yearFolder,
      ].join(".");

    const outputFileName =
      `${outputFilePrefix} ${formattedDate}.xlsx`;

    const outputPath =
      await join(
        outputFolder,
        outputFileName,
      );

    return {
      desktopPath,
      baseFolder,
      templatePath,
      outputFolder,
      outputPath,
    };
  },

  async selectPdf():
    Promise<string | null>
  {
    const paths =
      await this
        .getDailyPickingPaths();

    const selected =
      await open({
        multiple: false,
        directory: false,

        defaultPath:
          paths.baseFolder,

        filters:
          pdfFilter,
      });

    return typeof selected ===
      "string"
      ? selected
      : null;
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

  async printWorkbook(
    input:
      PrintWorkbookInput,
  ): Promise<void> {
    await invoke(
      "print_po_workbook",
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

interface ParsedDocumentDate {
  day: number;
  month: number;
  year: number;
}

function parseDocumentDate(
  value: string,
): ParsedDocumentDate {
  const match =
    value
      .trim()
      .match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      );

  if (!match) {
    throw new Error(
      `รูปแบบวันที่เอกสารไม่ถูกต้อง: ${value}`,
    );
  }

  const day =
    Number(
      match[1],
    );

  const month =
    Number(
      match[2],
    );

  let year =
    Number(
      match[3],
    );

  if (year >= 2400) {
    year -= 543;
  }

  const testDate =
    new Date(
      year,
      month - 1,
      day,
    );

  const validDate =
    testDate.getFullYear() ===
      year &&
    testDate.getMonth() ===
      month - 1 &&
    testDate.getDate() ===
      day;

  if (!validDate) {
    throw new Error(
      `วันที่เอกสารไม่ถูกต้อง: ${value}`,
    );
  }

  return {
    day,
    month,
    year,
  };
}