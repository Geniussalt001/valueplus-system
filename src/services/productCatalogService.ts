import {
  invoke,
} from "@tauri-apps/api/core";

import {
  desktopDir,
  join,
} from "@tauri-apps/api/path";

import type {
  ProductCatalogCommandInput,
  ProductCatalogDeleteResult,
  ProductCatalogItem,
  ProductCatalogListResult,
} from "../types/productCatalog.types";

async function getDatabasePath():
  Promise<string>
{
  const desktopPath =
    await desktopDir();

  return join(
    desktopPath,
    "ValuePlus Data",
    "valueplus.db",
  );
}

async function execute<T>(
  input: ProductCatalogCommandInput,
): Promise<T> {
  const databasePath =
    await getDatabasePath();

  return invoke<T>(
    "manage_product_catalog",
    {
      input: {
        databasePath,
        ...input,
      },
    },
  );
}

export const productCatalogService = {
  async list():
    Promise<ProductCatalogItem[]>
  {
    const result =
      await execute<
        ProductCatalogListResult
      >({
        action: "list",
      });

    return result.products;
  },

  async create(input: {
    productCode: string;
    displayName: string;
    lineName: string;
    displayOrder?: number;
    active: boolean;
  }): Promise<ProductCatalogItem> {
    return execute<ProductCatalogItem>({
      action: "create",
      ...input,
    });
  },

  async update(input: {
    productCode: string;
    displayName: string;
    lineName: string;
    displayOrder: number;
  }): Promise<ProductCatalogItem> {
    return execute<ProductCatalogItem>({
      action: "update",
      ...input,
    });
  },

  async setActive(
    productCode: string,
    active: boolean,
  ): Promise<ProductCatalogItem> {
    return execute<ProductCatalogItem>({
      action: "set-active",
      productCode,
      active,
    });
  },

  async delete(
    productCode: string,
  ): Promise<ProductCatalogDeleteResult> {
    return execute<ProductCatalogDeleteResult>({
      action: "delete",
      productCode,
    });
  },
};
