export type DollQuantities =
  Record<string, Record<string, string>>;

export interface DollSummaryDraft {
  summary_date: string;
  quantities: DollQuantities;
  total_quantity: number;
  warehouse_count: number;
  created_at: string;
  updated_at: string;
}

export interface DollSummaryDraftList {
  drafts: DollSummaryDraft[];
}

export type DollSummaryDraftAction =
  | "list"
  | "load"
  | "save"
  | "delete";

export interface DollSummaryDraftInput {
  action: DollSummaryDraftAction;
  summaryDate?: string;
  quantities?: DollQuantities;
}

export interface DollSummaryDeleteResult {
  deleted: boolean;
  summary_date: string;
}
