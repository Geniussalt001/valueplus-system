import { invoke } from "@tauri-apps/api/core";
import { desktopDir, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";

import { callAppsScript } from "./appsScriptClient";

import type {
  MonthlySalesInput,
  MonthlySalesArchiveResult,
  MonthlySalesResult,
  MonthlySalesSheetResult,
  MonthlySalesSummaryRecord,
} from "../types/monthlySales.types";

export const monthlySalesService = {
  async selectCsvFiles(): Promise<string[]> {
    const selected = await open({
      multiple: true,
      directory: false,
      defaultPath: await desktopDir(),
      filters: [{ name: "Express CSV", extensions: ["csv"] }],
    });
    if (Array.isArray(selected)) return selected;
    return typeof selected === "string" ? [selected] : [];
  },

  async selectOutputPath(suggestedName: string): Promise<string | null> {
    const selected = await save({
      defaultPath: await join(await desktopDir(), suggestedName),
      filters: [{ name: "Excel Workbook", extensions: ["xlsx"] }],
    });
    return typeof selected === "string" ? selected : null;
  },

  preview(input: MonthlySalesInput): Promise<MonthlySalesResult> {
    return invoke<MonthlySalesResult>("preview_monthly_sales", { input });
  },

  process(input: MonthlySalesInput): Promise<MonthlySalesResult> {
    return invoke<MonthlySalesResult>("process_monthly_sales", { input });
  },

  async openOutput(path: string): Promise<void> {
    if (path) await openPath(path);
  },

  saveSnapshot(
    records: MonthlySalesSummaryRecord[],
    sourceFiles: string[],
  ): Promise<MonthlySalesSheetResult> {
    return callAppsScript<MonthlySalesSheetResult>(
      "monthlySales.saveSnapshot",
      { records, sourceFiles },
      { requestProfile: "interactive" },
    );
  },

  listArchive(
    year?: number,
    month?: number,
  ): Promise<MonthlySalesArchiveResult> {
    return callAppsScript<MonthlySalesArchiveResult>(
      "monthlySales.list",
      { year, month },
      { cachePolicy: "network-first" },
    );
  },

  async openSpreadsheet(url: string): Promise<void> {
    if (url) await openUrl(url);
  },
};
