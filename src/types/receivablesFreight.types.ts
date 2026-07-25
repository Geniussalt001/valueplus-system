export interface ReceivablesFreightInput {
  csvPath: string;
  outputPath?: string;
}

export interface ReceivablesFreightRecord {
  source_row: number;
  date: string;
  invoice: string;
  source_invoice: string;
  source_customer: string;
  warehouse: string;
  customer: string;
  destination: string;
  quantity: number;
  exc_vat: number;
  item_count: number;
  status: "ready" | "review" | "error";
  message: string;
}

export interface ReceivablesMonthlySheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetName: string;
  created: boolean;
  sourceCount: number;
  insertedCount: number;
  duplicateCount: number;
  duplicates: string[];
  missingCount: number;
  firstInvoice: string;
  lastInvoice: string;
  month: number;
  buddhistYear: number;
}

export interface ReceivablesFreightResult {
  csv_path: string;
  template_url: string;
  record_count: number;
  total_quantity: number;
  total_exc_vat: number;
  review_count: number;
  error_count: number;
  warehouses: string[];
  records: ReceivablesFreightRecord[];
  output_path: string;
}
