import {
  invoke,
} from "@tauri-apps/api/core";

import {
  desktopDir,
  join,
} from "@tauri-apps/api/path";

import type {
  DollQuantities,
  DollSummaryDeleteResult,
  DollSummaryDraft,
  DollSummaryDraftInput,
  DollSummaryDraftList,
} from "../types/dollSummary.types";

async function getDatabasePath():
  Promise<string>
{
  const desktopPath =
    await desktopDir();

  return join(
    desktopPath,
    "ValuePlus Data",
    "valueplus.db",
  );
}

async function execute<T>(
  input: DollSummaryDraftInput,
): Promise<T> {
  return invoke<T>(
    "manage_doll_summary",
    {
      input: {
        databasePath:
          await getDatabasePath(),
        ...input,
      },
    },
  );
}

export const dollSummaryService = {
  async list(): Promise<DollSummaryDraft[]> {
    const result =
      await execute<DollSummaryDraftList>({
        action: "list",
      });

    return result.drafts;
  },

  async load(
    summaryDate: string,
  ): Promise<DollSummaryDraft> {
    return execute<DollSummaryDraft>({
      action: "load",
      summaryDate,
    });
  },

  async save(
    summaryDate: string,
    quantities: DollQuantities,
  ): Promise<DollSummaryDraft> {
    return execute<DollSummaryDraft>({
      action: "save",
      summaryDate,
      quantities,
    });
  },

  async delete(
    summaryDate: string,
  ): Promise<DollSummaryDeleteResult> {
    return execute<DollSummaryDeleteResult>({
      action: "delete",
      summaryDate,
    });
  },
};
