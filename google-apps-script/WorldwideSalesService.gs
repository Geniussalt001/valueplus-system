const WORLDWIDE_SALES_CONFIG = {
  STORE_SHEET: "WW_STORES",
  PRODUCT_SHEET: "WW_PRODUCTS",
  SALES_SHEET: "WW_SALES",
  ITEM_SHEET: "WW_SALES_ITEMS",
  STORE_HEADERS: [
    "STORE_ID", "STORE_NAME", "PROVINCE", "ACTIVE",
    "CREATED_AT", "UPDATED_AT", "UPDATED_BY",
  ],
  PRODUCT_HEADERS: [
    "PRODUCT_ID", "PRODUCT_NAME", "WEIGHT_GRAMS",
    "ACTIVE", "CREATED_AT", "UPDATED_AT", "UPDATED_BY",
  ],
  SALES_HEADERS: [
    "SALE_ID", "PART", "SALE_DATE", "STORE_ID",
    "STORE_NAME", "PROVINCE", "CREATED_BY", "CREATED_AT",
  ],
  ITEM_HEADERS: [
    "SALE_ID", "PRODUCT_ID", "PRODUCT_NAME", "WEIGHT_GRAMS",
    "CARTONS",
  ],
};

function getWorldwideSalesBootstrap() {
  const database = getWorldwideSalesDatabase();

  return {
    stores: readWorldwideStores(database.stores),
    products: readWorldwideProducts(database.products),
    salesCount: Math.max(database.sales.getLastRow() - 1, 0),
  };
}

function createWorldwideStore(input, userCode) {
  const name = cleanWorldwideSalesText(input && input.name, 160);
  const province = cleanWorldwideSalesText(input && input.province, 100);

  if (!name || !province) {
    throw new Error("กรุณากรอกชื่อร้านค้าและจังหวัดให้ครบถ้วน");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const database = getWorldwideSalesDatabase();
    const duplicate = readWorldwideStores(database.stores).some(function (store) {
      return normalizeWorldwideSalesKey(store.name) === normalizeWorldwideSalesKey(name) &&
        normalizeWorldwideSalesKey(store.province) === normalizeWorldwideSalesKey(province);
    });

    if (duplicate) {
      throw new Error("ร้านค้านี้มีอยู่ในฐานข้อมูลแล้ว");
    }

    const now = new Date();
    const store = {
      id: createWorldwideSalesId("STO"),
      name: name,
      province: province,
    };

    database.stores.appendRow([
      store.id, store.name, store.province, true,
      now, now, String(userCode || ""),
    ]);
    SpreadsheetApp.flush();
    return store;
  } finally {
    lock.releaseLock();
  }
}

function createWorldwideProduct(input, userCode) {
  const name = cleanWorldwideSalesText(input && input.name, 200);
  const weightGrams = Number(input && input.weightGrams);
  if (!name || !Number.isFinite(weightGrams) || weightGrams <= 0) {
    throw new Error("กรุณากรอกชื่อสินค้าและน้ำหนักให้ถูกต้อง");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const database = getWorldwideSalesDatabase();
    const duplicate = readWorldwideProducts(database.products).some(function (product) {
      return normalizeWorldwideSalesKey(product.name) === normalizeWorldwideSalesKey(name) &&
        product.weightGrams === weightGrams;
    });

    if (duplicate) {
      throw new Error("สินค้านี้มีอยู่ในฐานข้อมูลแล้ว");
    }

    const now = new Date();
    const product = {
      id: createWorldwideSalesId("PRD"),
      name: name,
      weightGrams: weightGrams,
    };

    database.products.appendRow([
      product.id, product.name, product.weightGrams,
      true, now, now, String(userCode || ""),
    ]);
    SpreadsheetApp.flush();
    return product;
  } finally {
    lock.releaseLock();
  }
}

function createWorldwideSale(input, userCode) {
  const part = String(input && input.part || "").trim().toLowerCase();
  const saleDate = String(input && input.date || "").trim();
  const storeId = String(input && input.storeId || "").trim();
  const items = input && Array.isArray(input.items) ? input.items : [];

  if (part !== "retail" && part !== "worldwide") {
    throw new Error("PART ที่เลือกไม่ถูกต้อง");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDate) || !isValidWorldwideSalesDate(saleDate)) {
    throw new Error("วันที่ขายไม่ถูกต้อง");
  }
  if (!storeId || items.length === 0) {
    throw new Error("กรุณาเลือกร้านค้าและสินค้าอย่างน้อย 1 รายการ");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const database = getWorldwideSalesDatabase();
    const stores = readWorldwideStores(database.stores);
    const products = readWorldwideProducts(database.products);
    const store = stores.filter(function (candidate) {
      return candidate.id === storeId;
    })[0];

    if (!store) {
      throw new Error("ไม่พบร้านค้าที่เลือกในฐานข้อมูล");
    }

    const productsById = {};
    products.forEach(function (product) {
      productsById[product.id] = product;
    });

    const seenProducts = {};
    const normalizedItems = items.map(function (item) {
      const productId = String(item && item.productId || "").trim();
      const cartons = Number(item && item.cartons);
      const product = productsById[productId];

      if (!product) {
        throw new Error("ไม่พบสินค้าในฐานข้อมูล: " + (productId || "-"));
      }
      if (seenProducts[productId]) {
        throw new Error("พบสินค้าซ้ำในรายการขาย: " + product.name);
      }
      if (!Number.isInteger(cartons) || cartons <= 0) {
        throw new Error("จำนวนลังของ " + product.name + " ไม่ถูกต้อง");
      }

      seenProducts[productId] = true;
      return { product: product, cartons: cartons };
    });

    const saleId = createWorldwideSalesId("SAL");
    const now = new Date();
    database.sales.appendRow([
      saleId, part.toUpperCase(), saleDate, store.id,
      store.name, store.province, String(userCode || ""), now,
    ]);

    const itemRows = normalizedItems.map(function (item) {
      return [
        saleId, item.product.id, item.product.name,
        item.product.weightGrams, item.cartons,
      ];
    });
    database.items.getRange(
      database.items.getLastRow() + 1, 1,
      itemRows.length, WORLDWIDE_SALES_CONFIG.ITEM_HEADERS.length,
    ).setValues(itemRows);
    SpreadsheetApp.flush();

    return {
      saleId: saleId,
      itemCount: itemRows.length,
      totalCartons: normalizedItems.reduce(function (sum, item) {
        return sum + item.cartons;
      }, 0),
      createdAt: now.toISOString(),
    };
  } finally {
    lock.releaseLock();
  }
}

function getWorldwideSalesDatabase() {
  const spreadsheet = getSystemSpreadsheet();
  return {
    stores: ensureWorldwideSalesSheet(spreadsheet, WORLDWIDE_SALES_CONFIG.STORE_SHEET, WORLDWIDE_SALES_CONFIG.STORE_HEADERS),
    products: ensureWorldwideSalesSheet(spreadsheet, WORLDWIDE_SALES_CONFIG.PRODUCT_SHEET, WORLDWIDE_SALES_CONFIG.PRODUCT_HEADERS),
    sales: ensureWorldwideSalesSheet(spreadsheet, WORLDWIDE_SALES_CONFIG.SALES_SHEET, WORLDWIDE_SALES_CONFIG.SALES_HEADERS),
    items: ensureWorldwideSalesSheet(spreadsheet, WORLDWIDE_SALES_CONFIG.ITEM_SHEET, WORLDWIDE_SALES_CONFIG.ITEM_HEADERS),
  };
}

function ensureWorldwideSalesSheet(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  migrateWorldwideSalesUnits(sheet, name);
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setBackground("#6d28d9")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  return sheet;
}

function migrateWorldwideSalesUnits(sheet, name) {
  if (sheet.getLastRow() < 1) return;

  if (name === WORLDWIDE_SALES_CONFIG.PRODUCT_SHEET) {
    const header = sheet.getRange(1, 1, 1, Math.min(sheet.getMaxColumns(), 8)).getDisplayValues()[0];
    if (header[3] !== "PIECES_PER_CARTON") return;
    const rowCount = Math.max(sheet.getLastRow() - 1, 0);
    if (rowCount > 0) {
      const rows = sheet.getRange(2, 1, rowCount, 8).getValues().map(function (row) {
        return [row[0], row[1], row[2], row[4], row[5], row[6], row[7]];
      });
      sheet.getRange(2, 1, rowCount, 8).clearContent();
      sheet.getRange(2, 1, rows.length, 7).setValues(rows);
    }
    sheet.getRange(1, 1, 1, 8).clearContent();
    return;
  }

  if (name === WORLDWIDE_SALES_CONFIG.ITEM_SHEET) {
    const header = sheet.getRange(1, 1, 1, Math.min(sheet.getMaxColumns(), 7)).getDisplayValues()[0];
    if (header[4] !== "PIECES_PER_CARTON") return;
    const rowCount = Math.max(sheet.getLastRow() - 1, 0);
    if (rowCount > 0) {
      const rows = sheet.getRange(2, 1, rowCount, 7).getValues().map(function (row) {
        return [row[0], row[1], row[2], row[3], row[5]];
      });
      sheet.getRange(2, 1, rowCount, 7).clearContent();
      sheet.getRange(2, 1, rows.length, 5).setValues(rows);
    }
    sheet.getRange(1, 1, 1, 7).clearContent();
  }
}

function readWorldwideStores(sheet) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, WORLDWIDE_SALES_CONFIG.STORE_HEADERS.length)
    .getValues()
    .filter(function (row) { return Boolean(row[0]) && row[3] !== false; })
    .map(function (row) {
      return { id: String(row[0]), name: String(row[1]), province: String(row[2]) };
    })
    .sort(function (a, b) { return a.name.localeCompare(b.name, "th"); });
}

function readWorldwideProducts(sheet) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, WORLDWIDE_SALES_CONFIG.PRODUCT_HEADERS.length)
    .getValues()
    .filter(function (row) { return Boolean(row[0]) && row[3] !== false; })
    .map(function (row) {
      return {
        id: String(row[0]), name: String(row[1]),
        weightGrams: Number(row[2]),
      };
    })
    .sort(function (a, b) { return a.name.localeCompare(b.name, "th"); });
}

function cleanWorldwideSalesText(value, maximumLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maximumLength);
}

function normalizeWorldwideSalesKey(value) {
  return cleanWorldwideSalesText(value, 250).toLocaleLowerCase();
}

function createWorldwideSalesId(prefix) {
  return prefix + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 20).toUpperCase();
}

function isValidWorldwideSalesDate(value) {
  const parts = value.split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.getFullYear() === parts[0] &&
    date.getMonth() === parts[1] - 1 && date.getDate() === parts[2];
}
