export interface DoDeliveryInput { pdfPaths: string[]; }
export interface DoDeliveryRecord {
  record_key: string; source_id: string; source_file: string; page: number;
  date: string; year: number; buddhist_year: number; month: number;
  warehouse_code: string; route_code: string; branch_code: string;
  branch_name: string; product_code: string; product_name: string; quantity: number;
}
export interface DoDeliveryRankedBranch { branch_code: string; branch_name: string; quantity: number; }
export interface DoDeliveryRankedProduct { product_code: string; product_name: string; quantity: number; }
export interface DoDeliveryWarehouse { warehouse_code: string; quantity: number; }
export interface DoDeliveryFileResult { name: string; source_id: string; record_count: number; warning_count: number; duplicate_in_selection: boolean; }
export interface DoDeliveryResult {
  file_count: number; record_count: number; branch_count: number; product_count: number;
  total_quantity: number; files: DoDeliveryFileResult[]; records: DoDeliveryRecord[];
  top_branches: DoDeliveryRankedBranch[]; top_products: DoDeliveryRankedProduct[];
  warehouses: DoDeliveryWarehouse[];
}
export interface DoDeliverySaveResult {
  insertedCount: number; duplicateFileCount: number; totalRecords: number;
  spreadsheetUrl: string; unresolvedBranchCount: number;
}
