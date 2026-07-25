export interface ReceivablesArchiveSummary {
  spreadsheetId: string;
  spreadsheetName: string;
  spreadsheetUrl: string;
  exportUrl: string;
  month: number;
  monthName: string;
  buddhistYear: number;
  modifiedAt: string;
}

export interface ReceivablesArchiveRow {
  rowNumber: number;
  values: string[];
  formulas: string[];
}

export interface ReceivablesArchiveDetail
  extends ReceivablesArchiveSummary {
  sheetNames: string[];
  selectedSheet: string;
  columnCount: number;
  truncated: boolean;
  recordCount: number;
  totalQuantity: number;
  totalExcVat: number;
  rows: ReceivablesArchiveRow[];
}

export interface ReceivablesArchiveChange {
  rowNumber: number;
  column: number;
  value: string;
}
