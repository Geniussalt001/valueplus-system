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

export interface ReceivablesCellStyle {
  background: string;
  fontColor: string;
  fontWeight: string;
  fontStyle: string;
  fontSize: number;
  fontFamily: string;
  horizontalAlignment: string;
  verticalAlignment: string;
  wrapStrategy: string;
  numberFormat: string;
}

export interface ReceivablesMergedRange {
  row: number;
  column: number;
  rowCount: number;
  columnCount: number;
}

export interface ReceivablesArchiveRow {
  rowNumber: number;
  values: string[];
  formulas: string[];
  styleIds: number[];
}

export interface ReceivablesArchiveDetail
  extends ReceivablesArchiveSummary {
  sheetNames: string[];
  selectedSheet: string;
  columnCount: number;
  frozenRows: number;
  frozenColumns: number;
  columnWidths: number[];
  styles: ReceivablesCellStyle[];
  mergedRanges: ReceivablesMergedRange[];
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
