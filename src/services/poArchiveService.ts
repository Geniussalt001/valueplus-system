import {
  invoke,
} from "@tauri-apps/api/core";

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
};
