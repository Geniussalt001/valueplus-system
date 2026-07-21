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
  DailySoInput,
  DailySoPaths,
  DailySoResult,
} from "../types/dailySo.types";

const reportFolderName =
  "รายงาน SOรายวัน";

const templateFileName =
  "Data-SO.Import.xlsx";

const pdfFilter = [
  {
    name:
      "PDF Document",

    extensions: [
      "pdf",
    ],
  },
];

export const dailySoService = {
  async getPaths():
    Promise<DailySoPaths>
  {
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

    return {
      desktopPath,
      baseFolder,
      templatePath,
      outputFolder:
        baseFolder,
    };
  },

  async selectPdf():
    Promise<string | null>
  {
    const paths =
      await this.getPaths();

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
    input: DailySoInput,
  ): Promise<DailySoResult> {
    return invoke<DailySoResult>(
      "preview_daily_so",
      {
        input,
      },
    );
  },

  async process(
    input: DailySoInput,
  ): Promise<DailySoResult> {
    return invoke<DailySoResult>(
      "process_daily_so",
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
        "ไม่พบโฟลเดอร์ผลลัพธ์",
      );
    }

    await openPath(
      folderPath,
    );
  },
};
