import { invoke } from "@tauri-apps/api/core";
import { desktopDir } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";

import { callAppsScript } from "./appsScriptClient";
import type { DoDeliveryInput, DoDeliveryResult, DoDeliverySaveResult } from "../types/doDelivery.types";

export const doDeliveryService = {
  async selectPdfFiles(): Promise<string[]> {
    const selected = await open({
      multiple: true, directory: false, defaultPath: await desktopDir(),
      filters: [{ name: "รายงาน DO", extensions: ["pdf"] }],
    });
    if (Array.isArray(selected)) return selected;
    return typeof selected === "string" ? [selected] : [];
  },
  preview(input: DoDeliveryInput): Promise<DoDeliveryResult> {
    return invoke<DoDeliveryResult>("preview_do_delivery", { input });
  },
  save(result: DoDeliveryResult): Promise<DoDeliverySaveResult> {
    return callAppsScript<DoDeliverySaveResult>(
      "doDelivery.save", { records: result.records, files: result.files },
      { requestProfile: "interactive" },
    );
  },
  async openSpreadsheet(url: string): Promise<void> { if (url) await openUrl(url); },
};
