import {
  invoke,
} from "@tauri-apps/api/core";

import {
  desktopDir,
} from "@tauri-apps/api/path";

import {
  open,
} from "@tauri-apps/plugin-dialog";

import type {
  SalesBillingOrder,
  SalesBillingPreview,
  SalesBillingProgress,
} from "../types/salesBilling.types";

const pdfFilter = [
  {
    name: "PDF Document",
    extensions: ["pdf"],
  },
];

export const salesBillingService = {
  async selectPdf(): Promise<string | null> {
    const selected = await open({
      multiple: false,
      directory: false,
      defaultPath: await desktopDir(),
      filters: pdfFilter,
    });

    return typeof selected === "string"
      ? selected
      : null;
  },

  async preview(
    pdfPath: string,
    startIv: string,
  ): Promise<SalesBillingPreview> {
    return invoke<SalesBillingPreview>(
      "preview_sales_billing",
      {
        input: {
          pdfPath,
          startIv,
        },
      },
    );
  },

  async run(
    orders: SalesBillingOrder[],
    simulate: boolean,
  ): Promise<SalesBillingProgress> {
    return invoke<SalesBillingProgress>(
      "run_sales_billing",
      {
        input: {
          orders,
          simulate,
        },
      },
    );
  },

  async control(
    action: "PAUSE" | "RESUME" | "STOP",
  ): Promise<void> {
    await invoke(
      "control_sales_billing",
      { action },
    );
  },
};
