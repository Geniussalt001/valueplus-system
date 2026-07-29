export interface SalesBillingItem {
  cpall_code: string;
  barcode: string;
  pdf_name: string;
  quantity: number;
  unit_price: number;
  express_code: string;
  express_input_code: string;
  match_status: string;
  match_method: string;
  match_score: number;
  excluded: boolean;
}

export interface SalesBillingOrder {
  po_number: string;
  po_date: string;
  express_date: string;
  warehouse_code: string;
  warehouse_text: string;
  warehouse_group: string;
  warehouse_sequence: number;
  sales_area_code: string;
  iv_number: string;
  items: SalesBillingItem[];
  warnings: string[];
  ready: boolean;
  selected?: boolean;
}

export interface SalesBillingSummary {
  orderCount: number;
  readyCount: number;
  reviewCount: number;
  itemCount: number;
  activeItemCount: number;
}

export interface SalesBillingPreview {
  orders: SalesBillingOrder[];
  summary: SalesBillingSummary;
}

export interface SalesBillingProgress {
  type:
    | "progress"
    | "paused"
    | "finished"
    | "control";
  action?:
    | "PAUSE"
    | "RESUME"
    | "STOP";
  success?: boolean;
  message?: string;
  orderIndex?: number;
  orderTotal?: number;
  ivNumber?: string;
  poNumber?: string;
  step?: string;
  itemIndex?: number;
  itemTotal?: number;
  detail?: string;
}
