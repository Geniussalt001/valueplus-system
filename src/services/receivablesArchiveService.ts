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
  async list():
    Promise<
      ReceivablesArchiveSummary[]
    >
  {
    return callAppsScript<
      ReceivablesArchiveSummary[]
    >(
      "receivables.archiveList",
    );
  },

  async get(
    spreadsheetId: string,
    sheetName = "",
  ): Promise<
    ReceivablesArchiveDetail
  > {
    return callAppsScript<
      ReceivablesArchiveDetail
    >(
      "receivables.archiveGet",
      {
        spreadsheetId,
        sheetName,
      },
    );
  },

  async update(
    spreadsheetId: string,
    sheetName: string,
    changes:
      ReceivablesArchiveChange[],
  ): Promise<
    ReceivablesArchiveDetail
  > {
    return callAppsScript<
      ReceivablesArchiveDetail
    >(
      "receivables.archiveUpdate",
      {
        spreadsheetId,
        sheetName,
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
