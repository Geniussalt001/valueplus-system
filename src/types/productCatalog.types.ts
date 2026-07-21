export interface ProductCatalogItem {
  product_code: string;
  source_name: string;
  display_name: string;
  line_name: string;
  display_order: number;
  active: boolean;
  first_seen_date: string;
  last_seen_date: string;
  last_source_path: string;
  created_at: string;
  updated_at: string;
}

export interface ProductCatalogListResult {
  products: ProductCatalogItem[];
}

export type ProductCatalogAction =
  | "list"
  | "create"
  | "update"
  | "set-active"
  | "delete";

export interface ProductCatalogCommandInput {
  action: ProductCatalogAction;
  productCode?: string;
  displayName?: string;
  lineName?: string;
  displayOrder?: number;
  active?: boolean;
}

export interface ProductCatalogDeleteResult {
  deleted: boolean;
  product: ProductCatalogItem;
}
