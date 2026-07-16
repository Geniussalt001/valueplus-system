export type PoStatus =
  | "waiting"
  | "reviewing"
  | "complete"
  | "issue";

export interface PoRecord {
  id: string;
  ivNumber: string;
  poNumber: string;
  documentDate: string;
  assignee: string;
  branch: string;
  status: PoStatus;

  pdfFileId?: string;
  pdfName?: string;
  pdfUrl?: string;

  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  note?: string;
}

export interface NewPoInput {
  ivNumber: string;
  poNumber: string;
  documentDate: string;
  assignee: string;
  branch: string;
}

export interface PoStatusOption {
  value: PoStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
}