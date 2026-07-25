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

  async openGoogleSheetEditor(
    spreadsheetId: string,
    _title: string,
  ): Promise<void> {
    const normalizedId =
      spreadsheetId.trim();

    if (
      normalizedId.length < 20 ||
      normalizedId.length > 100 ||
      !/^[A-Za-z0-9_-]+$/.test(
        normalizedId,
      )
    ) {
      throw new Error(
        "รหัส Google Sheet ไม่ถูกต้อง",
      );
    }

    await openUrl(
      `https://docs.google.com/spreadsheets/d/${normalizedId}/edit`,
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
