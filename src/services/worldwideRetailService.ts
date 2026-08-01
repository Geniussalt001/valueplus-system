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

  getPdf(
    id: string,
    documentType: "po" | "iv",
  ): Promise<WorldwideRetailPdf> {
    return callAppsScript<
      WorldwideRetailPdf
    >(
      "worldwide.getPdf",
      {
        id,
        documentType,
      },
    );
  },
};

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
