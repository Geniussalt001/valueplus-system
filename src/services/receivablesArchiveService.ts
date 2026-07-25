import {
  openUrl,
} from "@tauri-apps/plugin-opener";

import {
  callAppsScript,
} from "./appsScriptClient";

import type {
  ReceivablesArchiveChange,
  ReceivablesArchiveDetail,
  ReceivablesArchiveSummary,
} from "../types/receivablesArchive.types";

export const receivablesArchiveService = {
  list(): Promise<
    ReceivablesArchiveSummary[]
  > {
    return callAppsScript<
      ReceivablesArchiveSummary[]
    >(
      "receivables.archiveList",
    );
  },

  get(
    spreadsheetId: string,
  ): Promise<ReceivablesArchiveDetail> {
    return callAppsScript<
      ReceivablesArchiveDetail
    >(
      "receivables.archiveGet",
      {
        spreadsheetId,
      },
    );
  },

  update(
    spreadsheetId: string,
    changes:
      ReceivablesArchiveChange[],
  ): Promise<ReceivablesArchiveDetail> {
    return callAppsScript<
      ReceivablesArchiveDetail
    >(
      "receivables.archiveUpdate",
      {
        spreadsheetId,
        changes,
      },
    );
  },

  async openGoogleSheet(
    url: string,
  ): Promise<void> {
    await openUrl(url);
  },

  async exportExcel(
    url: string,
  ): Promise<void> {
    await openUrl(url);
  },
};
