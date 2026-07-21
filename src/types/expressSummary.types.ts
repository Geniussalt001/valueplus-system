export interface ExpressSummaryInput {
  csvPath: string;
}

export interface ExpressCatalogImportResult {
  status:
    | "success"
    | "already_imported";
  database_path: string;
  source_path: string;
  source_hash: string;
  encoding: string;
  document_date: string;
  invoice_count?: number;
  discovered_products: number;
  new_products: number;
  updated_products: number;
}

export interface ExpressWarehouseSummary {
  warehouse: string;
  iv_count: number;
  iv_numbers: string[];
  item_line_count: number;
  product_count: number;
  total_quantity: number;
}

export interface ExpressProductSummary {
  product_code: string;
  product_name: string;
  quantity: number;
  warehouses: string[];
}

export interface ExpressInvoiceItem {
  product_code: string;
  product_name: string;
  quantity: number;
  row_number: number;
}

export interface ExpressInvoice {
  warehouse: string;
  warehouse_label: string;
  warehouse_sequence: number;
  iv_number: string;
  document_date: string;
  row_number: number;
  item_line_count: number;
  total_quantity: number;
  items: ExpressInvoiceItem[];
}

export interface ExpressSummaryResult {
  source_path: string;
  encoding: string;
  document_dates: string[];
  iv_count: number;
  warehouse_count: number;
  item_line_count: number;
  product_count: number;
  total_quantity: number;
  warehouses: ExpressWarehouseSummary[];
  products: ExpressProductSummary[];
  invoices: ExpressInvoice[];
  catalog: ExpressCatalogImportResult;
}
