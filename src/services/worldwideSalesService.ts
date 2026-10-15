import { invoke } from "@tauri-apps/api/core";
import { desktopDir, join } from "@tauri-apps/api/path";

import { callAppsScript } from "./appsScriptClient";

import type {
  WorldwideProduct,
  WorldwideSaleInput,
  WorldwideSaleResult,
  WorldwideSalesBootstrap,
  WorldwideStore,
} from "../types/worldwideSales.types";

const thaiMonths = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export const worldwideSalesService = {
  bootstrap(): Promise<WorldwideSalesBootstrap> {
    return callAppsScript<WorldwideSalesBootstrap>(
      "worldwideSales.bootstrap",
      {},
      { cachePolicy: "network-first" },
    );
  },

  createStore(name: string, province: string): Promise<WorldwideStore> {
    return callAppsScript<WorldwideStore>(
      "worldwideSales.storeCreate",
      { name, province },
      { requestProfile: "interactive" },
    );
  },

  createProduct(
    name: string,
    weightGrams: number,
  ): Promise<WorldwideProduct> {
    return callAppsScript<WorldwideProduct>(
      "worldwideSales.productCreate",
      // Older deployed Apps Script versions still validate this legacy field.
      // Keep sending a neutral value while the UI and reports use cartons only.
      { name, weightGrams, piecesPerCarton: 1 },
      { requestProfile: "interactive" },
    );
  },

  createSale(input: WorldwideSaleInput): Promise<WorldwideSaleResult> {
    return callAppsScript<WorldwideSaleResult>(
      "worldwideSales.saleCreate",
      input,
      { requestProfile: "interactive" },
    );
  },

  async updateMonthlyExcel(
    payload: {
      saleId: string;
      part: WorldwideSaleInput["part"];
      date: string;
      store: WorldwideStore;
      items: Array<WorldwideProduct & { cartons: number }>;
      createdAt: string;
    },
  ): Promise<{ outputPath: string; rowCount: number; totalCartons: number }> {
    const [yearText, monthText] = payload.date.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const buddhistYear = year + 543;
    const periodName = `${thaiMonths[month - 1]} ${buddhistYear}`;
    const outputPath = await join(
      await desktopDir(),
      "รายงานยอดขาย",
      periodName,
      `รายงานยอดขาย ${periodName}.xlsx`,
    );
    return invoke("update_worldwide_sales_report", {
      input: { outputPath, payload },
    });
  },
};
