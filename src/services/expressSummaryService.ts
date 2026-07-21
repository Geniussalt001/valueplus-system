import {
  invoke,
} from "@tauri-apps/api/core";

import {
  open,
} from "@tauri-apps/plugin-dialog";

import {
  desktopDir,
  join,
} from "@tauri-apps/api/path";

import type {
  ExpressSummaryInput,
  ExpressSummaryResult,
} from "../types/expressSummary.types";

const csvFilter = [
  {
    name:
      "CSV Document",

    extensions: [
      "csv",
    ],
  },
];

export const expressSummaryService = {
  async selectCsv():
    Promise<string | null>
  {
    const selected =
      await open({
        multiple: false,
        directory: false,
        filters: csvFilter,
      });

    return typeof selected ===
      "string"
      ? selected
      : null;
  },

  async process(
    input: ExpressSummaryInput,
  ): Promise<ExpressSummaryResult> {
    const desktopPath =
      await desktopDir();

    const catalogPath =
      await join(
        desktopPath,
        "ValuePlus Data",
        "valueplus.db",
      );

    return invoke<
      ExpressSummaryResult
    >(
      "process_express_summary",
      {
        input: {
          ...input,
          catalogPath,
        },
      },
    );
  },
};
