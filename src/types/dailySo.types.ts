export interface DailySoPaths {
  desktopPath: string;
  baseFolder: string;
  templatePath: string;
  outputFolder: string;
}

export interface DailySoInput {
  pdfPath: string;
  templatePath: string;
  outputFolder?: string;
  quantityOverrides?:
    Record<string, number>;
}

export type DailySoRecordStatus =
  | "ready"
  | "review"
  | "error";

export interface DailySoRecord {
  item_code: string;
  item_name: string;
  pdf_name: string;
  barcodes: string[];
  quantity: number;
  price: number;
  match_score: number;
  match_method: string;
  status: DailySoRecordStatus;
  message: string;
  original_quantity?: number;
  adjusted?: boolean;
}

export interface DailySoGroup {
  code: "Q19" | "Q20";
  po_numbers: string[];
  po_text: string;
  so_text: string;
  warehouses: string[];
  po_count: number;
  item_count: number;
  ready_count: number;
  review_count: number;
  error_count: number;
  messages: string[];
  total_quantity: number;
  output_name: string;
  records: DailySoRecord[];
}

export interface DailySoResult {
  pdf_path: string;
  template_path: string;
  document_date: string;
  output_date: string;
  po_count: number;
  item_line_count: number;
  error_count: number;
  unknown_warehouses: string[];
  groups: DailySoGroup[];
  output_folder: string;
  output_paths: string[];
}
