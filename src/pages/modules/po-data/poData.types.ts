export type PoStatus =
  | "waiting"
  | "reviewing"
  | "complete"
  | "issue";

export interface PoRecord {
  id: string;
  poNumber: string;
  ivNumber: string;
  documentDate: string;
  reference: string;
  customerName: string;
  assignee: string;
  status: PoStatus;

  branch?: string;
  pdfFileId?: string;
  pdfName?: string;
  pdfUrl?: string;

  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  note?: string;
}

export interface NewPoInput {
  poNumber: string;
  ivNumber: string;
  documentDate: string;
  reference: string;
  customerName: string;
  assignee: string;
}

export interface PoStatusOption {
  value: PoStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
}

export interface PoHistoryRecord {
  id: string;
  poId: string;
  action: string;
  oldStatus: string;
  newStatus: string;
  userCode: string;
  note: string;
  createdAt: string;
}