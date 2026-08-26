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
export interface DoBranchMasterRecord { branch_code: string; branch_name: string; province: string; region: string; source_row: number; }
export interface DoBranchMasterResult {
  file_name: string; branch_count: number; province_count: number; duplicate_count: number;
  conflict_count: number; regions: { region: string; branch_count: number }[]; records: DoBranchMasterRecord[];
}
export interface DoBranchMasterSaveResult {
  branchCount: number; updatedDoRows: number; spreadsheetUrl: string;
}
export interface DoAnalyticsPeriod { year: number; month: number; label: string; }
export interface DoAnalyticsRegion { region: string; quantity: number; provinceCount: number; branchCount: number; }
export interface DoAnalyticsProvince { province: string; region: string; quantity: number; branchCount: number; }
export interface DoAnalyticsBranch { branchCode: string; branchName: string; province: string; region: string; quantity: number; }
export interface DoAnalyticsProduct { productCode: string; productName: string; quantity: number; }
export interface DoAnalyticsResult {
  totalQuantity: number; branchCount: number; provinceCount: number; productCount: number;
  unresolvedBranchCount: number; periods: DoAnalyticsPeriod[]; regions: DoAnalyticsRegion[];
  provinces: DoAnalyticsProvince[]; topBranches: DoAnalyticsBranch[]; topProducts: DoAnalyticsProduct[];
  spreadsheetUrl: string;
}
