import {
  callAppsScript,
} from "./appsScriptClient";

import type {
  NewPoInput,
  PoHistoryRecord,
  PoRecord,
  PoStatus,
} from "../pages/modules/po-data/poData.types";

export interface PoPdfResponse {
  fileId: string;
  fileName: string;
  mimeType: string;
  base64Data: string;
}

export interface DeletePoResponse {
  success: boolean;
  id: string;
  poNumber: string;
}

export interface ClearAllPoResponse {
  success: boolean;
  deletedCount: number;
}

export const poDataService = {
  list(): Promise<PoRecord[]> {
    return callAppsScript<
      PoRecord[]
    >("po.list");
  },

  create(
    input: NewPoInput,
  ): Promise<PoRecord> {
    return callAppsScript<PoRecord>(
      "po.create",
      input,
    );
  },

  update(
    id: string,
    input: NewPoInput,
  ): Promise<PoRecord> {
    return callAppsScript<PoRecord>(
      "po.update",
      {
        id,
        input,
      },
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

  delete(
    id: string,
  ): Promise<DeletePoResponse> {
    return callAppsScript<
      DeletePoResponse
    >("po.delete", {
      id,
    });
  },

  clearAll(): Promise<ClearAllPoResponse> {
    return callAppsScript<
      ClearAllPoResponse
    >("po.clearAll");
  },

  history(
    poId: string,
  ): Promise<PoHistoryRecord[]> {
    return callAppsScript<
      PoHistoryRecord[]
    >("po.history", {
      poId,
    });
  },

  uploadPdf(
    id: string,
    fileName: string,
    base64Data: string,
  ): Promise<PoRecord> {
    return callAppsScript<PoRecord>(
      "po.uploadPdf",
      {
        id,
        fileName,
        base64Data,
      },
    );
  },

  getPdf(
    id: string,
  ): Promise<PoPdfResponse> {
    return callAppsScript<
      PoPdfResponse
    >("po.getPdf", {
      id,
    });
  },
};