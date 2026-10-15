import { callAppsScript } from "./appsScriptClient";

import type {
  WorldwideProduct,
  WorldwideSaleInput,
  WorldwideSaleResult,
  WorldwideSalesBootstrap,
  WorldwideStore,
} from "../types/worldwideSales.types";

export const worldwideSalesService = {
  bootstrap(): Promise<WorldwideSalesBootstrap> {
    return callAppsScript<WorldwideSalesBootstrap>(
      "worldwideSales.bootstrap",
      {},
      { cachePolicy: "network-first" },
    );
  },

  createStore(name: string, province: string): Promise<WorldwideStore> {
    return callAppsScript<WorldwideStore>(
      "worldwideSales.storeCreate",
      { name, province },
      { requestProfile: "interactive" },
    );
  },

  createProduct(
    name: string,
    weightGrams: number,
    piecesPerCarton: number,
  ): Promise<WorldwideProduct> {
    return callAppsScript<WorldwideProduct>(
      "worldwideSales.productCreate",
      { name, weightGrams, piecesPerCarton },
      { requestProfile: "interactive" },
    );
  },

  createSale(input: WorldwideSaleInput): Promise<WorldwideSaleResult> {
    return callAppsScript<WorldwideSaleResult>(
      "worldwideSales.saleCreate",
      input,
      { requestProfile: "interactive" },
    );
  },
};
