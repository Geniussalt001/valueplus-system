export interface MonthlySalesInput {
  csvPaths: string[];
  outputPath?: string;
}

export interface MonthlySalesMonth {
  year: number;
  buddhist_year: number;
  month: number;
  month_name: string;
  sales: number;
  cn: number;
  net: number;
}

export interface MonthlySalesProduct {
  cpall_code: string;
  product_name: string;
  sales: number;
  cn: number;
  net: number;
}

export interface MonthlySalesSummaryRecord {
  year: number;
  buddhist_year: number;
  month: number;
  month_name: string;
  type: "ขาย" | "CN";
  cpall_code: string;
  product_name: string;
  quantity: number;
}

export interface MonthlySalesExcludedProduct {
  express_code: string;
  name: string;
  transactions: number;
  quantity: number;
}

export interface MonthlySalesResult {
  csv_paths: string[];
  file_count: number;
  transaction_count: number;
  product_count: number;
  sales_total: number;
  cn_total: number;
  net_total: number;
  months: MonthlySalesMonth[];
  products: MonthlySalesProduct[];
  summary_records: MonthlySalesSummaryRecord[];
  excluded_products: MonthlySalesExcludedProduct[];
  excluded_count: number;
  output_path: string;
}

export interface MonthlySalesSheetResult {
  uploadId: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetName: string;
  sourceCount: number;
  replacedCount: number;
  totalRows: number;
  periods: string[];
  salesTotal: number;
  cnTotal: number;
  netTotal: number;
  updatedAt: string;
}

export interface MonthlySalesStoredRecord {
  year: number;
  month: number;
  monthName: string;
  type: "ขาย" | "CN";
  cpallCode: string;
  productName: string;
  quantity: number;
  updatedAt: string;
  updatedBy: string;
  sourceFiles: string;
}

export interface MonthlySalesArchiveResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetName: string;
  records: MonthlySalesStoredRecord[];
  totals: {
    sales: number;
    cn: number;
    net: number;
  };
}
