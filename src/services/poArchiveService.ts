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

import {
  DriveGatewayUploadError,
  getGatewayPdf,
  hasDriveGateway,
  uploadPdfWithGateway,
} from "./driveGatewayClient";

import type {
  LocalPdfData,
  PoArchivePdf,
  PoArchiveRecord,
  PoArchiveUploadResult,
  UploadPoArchiveInput,
  UploadPoArchivePathInput,
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

  async uploadFromPath(
    input: UploadPoArchivePathInput,
  ): Promise<PoArchiveUploadResult> {
    if (!hasDriveGateway()) {
      return uploadPathWithAppsScript(
        input,
      );
    }

    let uploadedFileId = "";

    try {
      const metadata =
        await invoke<{
          fileName: string;
          size: number;
        }>(
          "get_local_pdf_metadata",
          {
            path: input.path,
          },
        );

      const prepared =
        await callAppsScript<
          | {
              status: "ready";
              folderId: string;
              fileName: string;
            }
          | {
              status: "duplicate";
              result: PoArchiveUploadResult;
            }
        >(
          "archive.prepareUpload",
          {
            poNumber:
              input.poNumber,
            documentDate:
              input.documentDate,
            fileName:
              metadata.fileName,
          },
        );

      if (
        prepared.status ===
        "duplicate"
      ) {
        return prepared.result;
      }

      const uploaded =
        await uploadPdfWithGateway(
          input.path,
          prepared.folderId,
        );

      uploadedFileId =
        uploaded.fileId;
    } catch (reason) {
      if (
        reason instanceof
          DriveGatewayUploadError &&
        reason.stage === "transfer"
      ) {
        throw reason;
      }

      return uploadPathWithAppsScript(
        input,
      );
    }

    // The file already exists on Drive here. Registration is queueable,
    // so never fall back to uploading the same PDF a second time.
    return callAppsScript<
      PoArchiveUploadResult
    >(
      "archive.registerUpload",
      {
        poNumber:
          input.poNumber,
        documentDate:
          input.documentDate,
        warehouse:
          input.warehouse,
        fileId:
          uploadedFileId,
      },
    );
  },

  async getPdf(
    id: string,
    fileId = "",
    fileName = "document.pdf",
  ): Promise<PoArchivePdf> {
    if (
      fileId &&
      hasDriveGateway()
    ) {
      try {
        return await getGatewayPdf(
          fileId,
          fileName,
        );
      } catch {
        // Keep existing installations working during rollout.
      }
    }

    return callAppsScript<
      PoArchivePdf
    >(
      "archive.getPdf",
      {
        id,
      },
      {
        cachePolicy:
          "cache-first",
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

async function uploadPathWithAppsScript(
  input: UploadPoArchivePathInput,
) {
  const localPdf =
    await poArchiveService
      .readLocalPdf(
        input.path,
      );

  return poArchiveService.upload({
    poNumber: input.poNumber,
    documentDate:
      input.documentDate,
    warehouse: input.warehouse,
    fileName:
      localPdf.fileName,
    base64Data:
      localPdf.base64Data,
  });
}
