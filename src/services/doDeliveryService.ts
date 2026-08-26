import { invoke } from "@tauri-apps/api/core";
import { desktopDir } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";

import { callAppsScript } from "./appsScriptClient";
import type { DoAnalyticsResult, DoBranchMasterResult, DoBranchMasterSaveResult, DoDeliveryInput, DoDeliveryResult, DoDeliverySaveResult } from "../types/doDelivery.types";

export const doDeliveryService = {
  async selectPdfFiles(): Promise<string[]> {
    const selected = await open({
      multiple: true, directory: false, defaultPath: await desktopDir(),
      filters: [{ name: "รายงาน DO", extensions: ["pdf"] }],
    });
    if (Array.isArray(selected)) return selected;
    return typeof selected === "string" ? [selected] : [];
  },
  async selectMasterFile(): Promise<string | null> {
    const selected = await open({
      multiple: false, directory: false, defaultPath: await desktopDir(),
      filters: [{ name: "Master สาขา", extensions: ["xlsx"] }],
    });
    return typeof selected === "string" ? selected : null;
  },
  previewMaster(xlsxPath: string): Promise<DoBranchMasterResult> {
    return invoke<DoBranchMasterResult>("preview_do_branch_master", { xlsxPath });
  },
  saveMaster(result: DoBranchMasterResult): Promise<DoBranchMasterSaveResult> {
    return callAppsScript<DoBranchMasterSaveResult>(
      "doDelivery.saveMaster", { records: result.records, sourceFile: result.file_name },
      { requestProfile: "interactive" },
    );
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
  analytics(filters: { year?: number; month?: number; region?: string; province?: string } = {}): Promise<DoAnalyticsResult> {
    return callAppsScript<DoAnalyticsResult>("doDelivery.analytics", filters, { cachePolicy: "network-first" });
  },
  async openSpreadsheet(url: string): Promise<void> { if (url) await openUrl(url); },
};
