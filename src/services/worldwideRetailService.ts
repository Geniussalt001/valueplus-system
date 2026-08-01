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
  DeleteWorldwideRetailResult,
  SelectedWorldwidePdf,
  UploadWorldwideRetailInput,
  WorldwideAcknowledgementStatus,
  WorldwideRetailPdf,
  WorldwideRetailRecord,
} from "../types/worldwideRetail.types";

import type {
  LocalPdfData,
} from "../types/poArchive.types";

const pdfFilter = [
  {
    name: "PDF Document",
    extensions: [
      "pdf",
    ],
  },
];

export const worldwideRetailService = {
  list(): Promise<
    WorldwideRetailRecord[]
  > {
    return callAppsScript<
      WorldwideRetailRecord[]
    >("worldwide.list");
  },

  async selectPdf():
    Promise<
      SelectedWorldwidePdf | null
    >
  {
    const selected =
      await open({
        multiple: false,
        directory: false,
        defaultPath:
          await downloadDir(),
        filters: pdfFilter,
      });

    if (
      typeof selected !==
      "string"
    ) {
      return null;
    }

    return {
      path: selected,
      fileName:
        getFileName(selected),
    };
  },

  readPdf(
    path: string,
  ): Promise<LocalPdfData> {
    return invoke<LocalPdfData>(
      "read_local_pdf_base64",
      {
        path,
      },
    );
  },

  upload(
    input:
      UploadWorldwideRetailInput,
  ): Promise<
    WorldwideRetailRecord
  > {
    return callAppsScript<
      WorldwideRetailRecord
    >(
      "worldwide.upload",
      input,
    );
  },

  acknowledge(
    id: string,
    status:
      Exclude<
        WorldwideAcknowledgementStatus,
        "pending"
      >,
    note = "",
  ): Promise<
    WorldwideRetailRecord
  > {
    return callAppsScript<
      WorldwideRetailRecord
    >(
      "worldwide.acknowledge",
      {
        id,
        status,
        note,
      },
    );
  },

  delete(
    id: string,
  ): Promise<DeleteWorldwideRetailResult> {
    return callAppsScript<
      DeleteWorldwideRetailResult
    >(
      "worldwide.delete",
      {
        id,
      },
    );
  },

  async getPdf(
    id: string,
    documentType: "po" | "iv",
  ): Promise<WorldwideRetailPdf> {
    let lastError: unknown;

    for (
      let attempt = 1;
      attempt <= 3;
      attempt += 1
    ) {
      try {
        return await callAppsScript<
          WorldwideRetailPdf
        >(
          "worldwide.getPdf",
          {
            id,
            documentType,
          },
        );
      } catch (reason) {
        lastError = reason;

        if (
          attempt >= 3 ||
          !isRetryablePreviewError(
            reason,
          )
        ) {
          throw reason;
        }

        await wait(
          attempt === 1
            ? 400
            : 900,
        );
      }
    }

    throw lastError;
  },
};

function isRetryablePreviewError(
  reason: unknown,
) {
  const message =
    reason instanceof Error
      ? reason.message
      : String(reason);

  return [
    "ไม่ได้ส่งข้อมูลกลับมา",
    "เชื่อมต่อ Apps Script ไม่สำเร็จ",
    "network",
    "fetch",
    "timeout",
  ].some((keyword) =>
    message
      .toLowerCase()
      .includes(
        keyword.toLowerCase(),
      ),
  );
}

function wait(milliseconds: number) {
  return new Promise<void>(
    (resolve) => {
      window.setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

function getFileName(
  path: string,
) {
  const parts =
    path.split(
      /[\\/]/,
    );

  return (
    parts[
      parts.length - 1
    ] || "document.pdf"
  );
}
