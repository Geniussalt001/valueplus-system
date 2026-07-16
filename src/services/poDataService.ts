import { callAppsScript } from "./appsScriptClient";

import type {
  NewPoInput,
  PoRecord,
  PoStatus,
} from "../pages/modules/po-data/poData.types";

export const poDataService = {
  list(): Promise<PoRecord[]> {
    return callAppsScript<PoRecord[]>("po.list");
  },

  create(input: NewPoInput): Promise<PoRecord> {
    return callAppsScript<PoRecord>(
      "po.create",
      input,
    );
  },

  updateStatus(
    id: string,
    status: PoStatus,
    note = "",
  ): Promise<PoRecord> {
    return callAppsScript<PoRecord>(
      "po.updateStatus",
      {
        id,
        status,
        note,
      },
    );
  },
};