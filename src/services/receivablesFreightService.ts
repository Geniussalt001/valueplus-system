import {
  invoke,
} from "@tauri-apps/api/core";

import {
  callAppsScript,
} from "./appsScriptClient";

import {
  desktopDir,
  join,
} from "@tauri-apps/api/path";

import {
  open,
  save,
} from "@tauri-apps/plugin-dialog";

import {
  openPath,
} from "@tauri-apps/plugin-opener";

import type {
  CreditNoteRecord,
  CreditNoteResult,
  ReceivablesFreightInput,
  ReceivablesFreightRecord,
  ReceivablesFreightResult,
  ReceivablesMonthlySheetResult,
} from "../types/receivablesFreight.types";

export const receivablesTemplateUrl =
  "https://docs.google.com/spreadsheets/d/1zU-ALqCOMM2QjehlkKyNj1BPzdCPS-8rBm9iiIdhc9A/export?format=xlsx";

const csvFilter = [
  {
    name: "CSV Document",
    extensions: ["csv"],
  },
];

const excelFilter = [
  {
    name: "Excel Workbook",
    extensions: ["xlsx"],
  },
];

function normalizeGregorianDate(
  value: string,
): string {
  const match = String(value || "")
    .trim()
    .match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    );

  if (!match) {
    return String(value || "").trim();
  }

  const year = Number(match[3]);

  return [
    match[1].padStart(2, "0"),
    match[2].padStart(2, "0"),
    String(
      year >= 2400
        ? year - 543
        : year,
    ),
  ].join("/");
}

function normalizeCreditNoteInvoice(
  value: string,
): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(
      /^IV(?:\s*[:./_-]\s*|\s+)?(?=VPR)/,
      "",
    )
    .replace(/\s+/g, "");
}

function normalizeAppliedInvoice(
  value: string,
): string {
  return String(value || "").trim();
}

export const receivablesFreightService = {
  async selectCsv(): Promise<string | null> {
    const desktopPath =
      await desktopDir();

    const selected =
      await open({
        multiple: false,
        directory: false,
        defaultPath: desktopPath,
        filters: csvFilter,
      });

    return typeof selected === "string"
      ? selected
      : null;
  },

  async selectOutputPath(
    suggestedName: string,
  ): Promise<string | null> {
    const desktopPath =
      await desktopDir();

    const selected =
      await save({
        defaultPath: await join(
          desktopPath,
          suggestedName,
        ),
        filters: excelFilter,
      });

    return typeof selected === "string"
      ? selected
      : null;
  },

  async preview(
    input: ReceivablesFreightInput,
  ): Promise<ReceivablesFreightResult> {
    return invoke<ReceivablesFreightResult>(
      "preview_receivables_freight",
      { input },
    );
  },

  async previewCreditNotes(
    csvPath: string,
  ): Promise<CreditNoteResult> {
    return invoke<CreditNoteResult>(
      "preview_receivables_freight",
      {
        input: {
          csvPath,
          mode: "credit-notes",
        },
      },
    );
  },

  async process(
    input: ReceivablesFreightInput,
  ): Promise<ReceivablesFreightResult> {
    return invoke<ReceivablesFreightResult>(
      "process_receivables_freight",
      { input },
    );
  },

  async saveMonthlySheet(
    records: ReceivablesFreightRecord[],
  ): Promise<ReceivablesMonthlySheetResult> {
    return callAppsScript<
      ReceivablesMonthlySheetResult
    >(
      "receivables.saveMonthly",
      {
        records: records.map(
          (record) => ({
            ...record,
            date:
              normalizeGregorianDate(
                record.date,
              ),
          }),
        ),
      },
    );
  },

  async saveCreditNotes(
    records: CreditNoteRecord[],
  ): Promise<ReceivablesMonthlySheetResult> {
    return callAppsScript<
      ReceivablesMonthlySheetResult
    >(
      "receivables.saveCreditNotesV2",
      {
        records: records.map(
          (record) => {
            const referenceInvoice =
              normalizeCreditNoteInvoice(
                record.reference_invoice,
              );
            const appliedInvoice =
              normalizeAppliedInvoice(
                record.applied_invoice,
              );

            return {
              ...record,
              date:
                normalizeGregorianDate(
                  record.date,
                ),
              reference_invoice:
                referenceInvoice,
              applied_invoice:
                appliedInvoice,
            };
          },
        ),
      },
    );
  },

  async openOutput(
    outputPath: string,
  ): Promise<void> {
    if (!outputPath) {
      return;
    }

    await openPath(outputPath);
  },
};
