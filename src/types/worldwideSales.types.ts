export type WorldwideSalesPart = "retail" | "worldwide";

export interface WorldwideStore {
  id: string;
  name: string;
  province: string;
}

export interface WorldwideProduct {
  id: string;
  name: string;
  weightGrams: number;
}

export interface WorldwideSalesBootstrap {
  stores: WorldwideStore[];
  products: WorldwideProduct[];
  salesCount: number;
}

export interface WorldwideSaleInput {
  part: WorldwideSalesPart;
  date: string;
  storeId: string;
  items: Array<{
    productId: string;
    cartons: number;
  }>;
}

export interface WorldwideSaleResult {
  saleId: string;
  itemCount: number;
  totalCartons: number;
  createdAt: string;
}
