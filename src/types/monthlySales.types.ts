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
  excluded_products: MonthlySalesExcludedProduct[];
  excluded_count: number;
  output_path: string;
}
