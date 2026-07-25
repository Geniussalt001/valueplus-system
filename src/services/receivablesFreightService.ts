import {
  invoke,
} from "@tauri-apps/api/core";

import {
  desktopDir,
  join,
} from "@tauri-apps/api/path";

import {
  open,
  save,
} from "@tauri-apps/plugin-dialog";

import {
  openPath,
} from "@tauri-apps/plugin-opener";

import type {
  ReceivablesFreightInput,
  ReceivablesFreightResult,
} from "../types/receivablesFreight.types";

export const receivablesTemplateUrl =
  "https://docs.google.com/spreadsheets/d/1zU-ALqCOMM2QjehlkKyNj1BPzdCPS-8rBm9iiIdhc9A/export?format=xlsx";

const csvFilter = [
  {
    name: "CSV Document",
    extensions: ["csv"],
  },
];

const excelFilter = [
  {
    name: "Excel Workbook",
    extensions: ["xlsx"],
  },
];

export const receivablesFreightService = {
  async selectCsv(): Promise<string | null> {
    const desktopPath =
      await desktopDir();

    const selected =
      await open({
        multiple: false,
        directory: false,
        defaultPath: desktopPath,
        filters: csvFilter,
      });

    return typeof selected === "string"
      ? selected
      : null;
  },

  async selectOutputPath(
    suggestedName: string,
  ): Promise<string | null> {
    const desktopPath =
      await desktopDir();

    const selected =
      await save({
        defaultPath: await join(
          desktopPath,
          suggestedName,
        ),
        filters: excelFilter,
      });

    return typeof selected === "string"
      ? selected
      : null;
  },

  async preview(
    input: ReceivablesFreightInput,
  ): Promise<ReceivablesFreightResult> {
    return invoke<ReceivablesFreightResult>(
      "preview_receivables_freight",
      { input },
    );
  },

  async process(
    input: ReceivablesFreightInput,
  ): Promise<ReceivablesFreightResult> {
    return invoke<ReceivablesFreightResult>(
      "process_receivables_freight",
      { input },
    );
  },

  async openOutput(
    outputPath: string,
  ): Promise<void> {
    if (!outputPath) {
      return;
    }

    await openPath(outputPath);
  },
};
