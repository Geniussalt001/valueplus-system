import { invoke } from "@tauri-apps/api/core";
import { desktopDir, join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";

import type {
  SalesCnSummaryInput,
  SalesCnSummaryResult,
} from "../types/salesCnSummary.types";

const excelFilter = [
  {
    name: "Excel Workbook",
    extensions: ["xlsx"],
  },
];

async function getReportPath(): Promise<string> {
  const desktopPath = await desktopDir();
  return join(
    desktopPath,
    "รายงานยอดขาย CN",
    "ValuePlus_Sales_CN_Summary.xlsx",
  );
}

export const salesCnSummaryService = {
  async selectSource(): Promise<string | null> {
    const selected = await open({
      multiple: false,
      directory: false,
      title: "เลือกไฟล์ข้อมูลยอดขายและ CN ที่ต้องการเพิ่ม",
      filters: excelFilter,
    });

    return typeof selected === "string" ? selected : null;
  },

  async process(sourcePath: string): Promise<SalesCnSummaryResult> {
    const input: SalesCnSummaryInput = {
      sourcePath,
      reportPath: await getReportPath(),
    };

    return invoke<SalesCnSummaryResult>("process_sales_cn_summary", { input });
  },

  async openReport(reportPath?: string): Promise<void> {
    await openPath(reportPath || (await getReportPath()));
  },
};
