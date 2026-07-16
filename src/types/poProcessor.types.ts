export type PoProcessingStatus =
  | "ready"
  | "review"
  | "error";

export interface PoProductMatch {
  barcode: string;
  pdf_name: string;
  data_name: string | null;
  target_name: string | null;
  excel_row: number | null;
  quantity: number;
  matched: boolean;
  message: string;
}

export interface PoPreviewRecord {
  sequence: number;
  iv_number: string;
  po_number: string;
  document_date: string;
  warehouse: string;
  target_sheet: string;
  pages: number[];
  items: PoProductMatch[];
  status: PoProcessingStatus;
  message: string;
  matched_count: number;
  item_count: number;
}

export interface PoPreviewResult {
  start_iv: string;
  po_count: number;
  ready_count: number;
  review_count: number;
  error_count: number;
  unused_sheets: string[];
  records: PoPreviewRecord[];
  output_path?: string;
}

export interface PoProcessorInput {
  pdfPath: string;
  templatePath: string;
  startIv: string;
  outputPath?: string;
}

export interface DailyPickingPaths {
  desktopPath: string;
  baseFolder: string;
  templatePath: string;
  outputFolder: string;
  outputPath: string;
}