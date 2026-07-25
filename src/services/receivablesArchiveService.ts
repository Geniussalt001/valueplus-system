import {
  WebviewWindow,
} from "@tauri-apps/api/webviewWindow";

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
    url: string,
    title: string,
  ): Promise<void> {
    const safeId =
      spreadsheetId
        .replace(
          /[^a-zA-Z0-9_-]/g,
          "-",
        )
        .slice(0, 48);

    const label =
      `google-sheet-${safeId}`;

    const existingWindow =
      await WebviewWindow
        .getByLabel(label);

    if (existingWindow) {
      await existingWindow
        .show();

      await existingWindow
        .setFocus();

      return;
    }

    await new Promise<void>(
      (resolve, reject) => {
        const editorWindow =
          new WebviewWindow(
            label,
            {
              url,
              title,
              width: 1600,
              height: 950,
              minWidth: 1100,
              minHeight: 700,
              center: true,
              resizable: true,
              maximized: true,
              focus: true,
            },
          );

        void editorWindow.once(
          "tauri://created",
          () => {
            resolve();
          },
        );

        void editorWindow.once(
          "tauri://error",
          (event) => {
            reject(
              new Error(
                `เปิด Google Sheets Editor ไม่สำเร็จ: ${String(event.payload)}`,
              ),
            );
          },
        );
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
