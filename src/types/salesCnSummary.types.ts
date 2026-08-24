export interface SalesCnProductSummary {
  productCode: string;
  productName: string;
  sales: number;
  cn: number;
  net: number;
}

export interface SalesCnSummaryResult {
  reportPath: string;
  addedRows: number;
  skippedRows: number;
  totalRows: number;
  months: string[];
  productSummary: SalesCnProductSummary[];
  message: string;
}

export interface SalesCnSummaryInput {
  sourcePath: string;
  reportPath: string;
}
