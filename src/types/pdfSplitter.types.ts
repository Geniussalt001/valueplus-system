export type PdfSplitLogLevel =
  | "progress"
  | "info"
  | "success"
  | "warning"
  | "error";

export interface PdfSplitLogEvent {
  type: "log";
  level: PdfSplitLogLevel;
  message: string;
}

export interface PdfSplitInput {
  pdfPath: string;
  outputBase: string;
}

export interface PdfSplitRecord {
  po_number: string;
  warehouse: string;
  document_date: string;
  item_pages: number[];
  skipped_pages: number[];
  output_path: string;
  status:
    | "created"
    | "skipped"
    | "duplicate"
    | "error";
  message: string;
  duplicate_detected: boolean;
}

export interface PdfSplitResult {
  source_path: string;
  output_base: string;
  total_pages: number;
  po_count: number;
  created_count: number;
  skipped_page_count: number;
  duplicate_count: number;
  duplicate_folders: string[];
  output_folders: string[];
  records: PdfSplitRecord[];
}
