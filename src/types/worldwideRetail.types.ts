export type WorldwideAcknowledgementStatus =
  | "pending"
  | "received"
  | "rejected";

export interface WorldwideRetailRecord {
  id: string;
  ivNumber: string;
  poNumber: string;
  soNumber: string;
  documentDate: string;
  poFileId: string;
  poFileName: string;
  poFileUrl: string;
  poFileSize: number;
  ivFileId: string;
  ivFileName: string;
  ivFileUrl: string;
  ivFileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  acknowledgementStatus:
    WorldwideAcknowledgementStatus;
  acknowledgedAt: string;
  acknowledgedBy: string;
  acknowledgementNote: string;
}

export interface WorldwidePdfInput {
  fileName: string;
  base64Data: string;
}

export interface UploadWorldwideRetailInput {
  ivNumber: string;
  poNumber: string;
  soNumber: string;
  documentDate: string;
  poFile: WorldwidePdfInput;
  ivFile: WorldwidePdfInput;
}

export interface SelectedWorldwidePdf {
  path: string;
  fileName: string;
}
