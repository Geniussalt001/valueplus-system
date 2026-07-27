import {
  invoke,
} from "@tauri-apps/api/core";

import {
  downloadDir,
} from "@tauri-apps/api/path";

import {
  open,
} from "@tauri-apps/plugin-dialog";

import {
  callAppsScript,
} from "./appsScriptClient";

import type {
  LocalPdfData,
  PoArchivePdf,
  PoArchiveRecord,
  PoArchiveUploadResult,
  UploadPoArchiveInput,
} from "../types/poArchive.types";

export const poArchiveService = {
  async list():
    Promise<PoArchiveRecord[]>
  {
    return callAppsScript<
      PoArchiveRecord[]
    >(
      "archive.list",
    );
  },

  async readLocalPdf(
    path: string,
  ): Promise<LocalPdfData> {
    return invoke<LocalPdfData>(
      "read_local_pdf_base64",
      {
        path,
      },
    );
  },

  async upload(
    input: UploadPoArchiveInput,
  ): Promise<PoArchiveUploadResult> {
    return callAppsScript<
      PoArchiveUploadResult
    >(
      "archive.uploadPdf",
      input,
    );
  },

  async getPdf(
    id: string,
  ): Promise<PoArchivePdf> {
    return callAppsScript<
      PoArchivePdf
    >(
      "archive.getPdf",
      {
        id,
      },
    );
  },

  async selectDownloadFolder():
    Promise<string | null>
  {
    const selected =
      await open({
        directory: true,
        multiple: false,
        defaultPath:
          await downloadDir(),
      });

    return typeof selected === "string"
      ? selected
      : null;
  },

  async savePdf(
    folderPath: string,
    pdf: PoArchivePdf,
  ): Promise<string> {
    return invoke<string>(
      "save_archive_pdf_base64",
      {
        folderPath,
        fileName: pdf.fileName,
        base64Data:
          pdf.base64Data,
      },
    );
  },
};
