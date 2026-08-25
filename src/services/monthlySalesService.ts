import {
  invoke,
} from "@tauri-apps/api/core";

import {
  desktopDir,
} from "@tauri-apps/api/path";

import {
  open,
} from "@tauri-apps/plugin-dialog";

import {
  openPath,
} from "@tauri-apps/plugin-opener";

import type {
  MonthlySalesPreview,
  MonthlySalesSummary,
} from "../types/monthlySales.types";

const csvFilter = [
  {
    name: "CSV Document",
    extensions: ["csv"],
  },
];

export const monthlySalesService = {
  async selectCsv(): Promise<string | null> {
    const selected = await open({
      multiple: false,
      directory: false,
      defaultPath: await desktopDir(),
      filters: csvFilter,
    });

    return typeof selected === "string"
      ? selected
      : null;
  },

  async getSummary(
    selectedMonth?: string | null,
  ): Promise<MonthlySalesSummary> {
    return invoke<MonthlySalesSummary>(
      "get_monthly_sales",
      {
        selectedMonth:
          selectedMonth || null,
      },
    );
  },

  async preview(
    csvPath: string,
  ): Promise<MonthlySalesPreview> {
    return invoke<MonthlySalesPreview>(
      "preview_monthly_sales",
      { csvPath },
    );
  },

  async importCsv(
    csvPath: string,
  ): Promise<MonthlySalesSummary> {
    return invoke<MonthlySalesSummary>(
      "import_monthly_sales",
      { csvPath },
    );
  },

  async openWorkbook(
    workbookPath: string,
  ): Promise<void> {
    if (workbookPath) {
      await openPath(workbookPath);
    }
  },
};
