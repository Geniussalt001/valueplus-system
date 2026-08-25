import { invoke } from "@tauri-apps/api/core";
import { desktopDir, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";

import type {
  MonthlySalesInput,
  MonthlySalesResult,
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
};
