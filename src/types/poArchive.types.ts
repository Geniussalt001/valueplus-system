export type PoArchiveStatus =
  | "stored"
  | "duplicate";

export interface PoArchiveRecord {
  id: string;
  poNumber: string;
  documentDate: string;
  warehouse: string;
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  status: PoArchiveStatus;
  note: string;
}

export interface LocalPdfData {
  fileName: string;
  base64Data: string;
  size: number;
}

export interface UploadPoArchiveInput {
  poNumber: string;
  documentDate: string;
  warehouse: string;
  fileName: string;
  base64Data: string;
}

export interface UploadPoArchivePathInput
  extends Omit<
    UploadPoArchiveInput,
    "base64Data"
  > {
  path: string;
}

export interface PoArchivePdf {
  fileId: string;
  fileName: string;
  mimeType: "application/pdf";
  base64Data: string;
}

export interface PoArchiveUploadResult {
  status: PoArchiveStatus;
  message: string;
  record: PoArchiveRecord;
}
