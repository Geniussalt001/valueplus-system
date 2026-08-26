const DO_DELIVERY_CONFIG = {
  dataSheet: "ฐานข้อมูล DO",
  branchSheet: "ข้อมูลสาขา",
  historySheet: "ประวัติอัปโหลด DO",
  dashboardSheet: "Dashboard DO",
};

const DO_DATA_HEADERS = [
  "รหัสสรุป", "ปี", "เดือน", "รหัสคลัง", "รหัสสาขา", "ชื่อสาขา",
  "จังหวัด", "ภาค", "รหัสสินค้า", "ชื่อสินค้า", "จำนวนจัดส่งสะสม",
  "ผู้อัปเดต", "อัปเดตล่าสุด",
];
const DO_BRANCH_HEADERS = ["รหัสสาขา", "ชื่อสาขา", "จังหวัด", "ภาค", "ละติจูด", "ลองจิจูด", "อัปเดตล่าสุด"];
const DO_HISTORY_HEADERS = ["รหัสไฟล์", "ชื่อไฟล์", "จำนวนรายการ", "สถานะ", "ผู้อัปโหลด", "เวลาบันทึก"];

function saveDoBranchMaster(input, userCode) {
  const payload = input || {};
  const records = Array.isArray(payload.records) ? payload.records : [];
  if (!records.length) throw new Error("ไม่พบข้อมูล Master สาขา");
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const branchSheet = ensureDoSheet(spreadsheet, DO_DELIVERY_CONFIG.branchSheet, DO_BRANCH_HEADERS);
    const now = new Date(), unique = {};
    records.forEach(function(record) {
      const code = String(record.branch_code || "").trim();
      if (code && !unique[code]) unique[code] = [
        code, String(record.branch_name || ""), String(record.province || ""),
        normalizeDoRegion(record.region), "", "", now,
      ];
    });
    const rows = Object.keys(unique).sort().map(function(code) { return unique[code]; });
    if (branchSheet.getLastRow() > 1) branchSheet.getRange(2, 1, branchSheet.getLastRow() - 1, DO_BRANCH_HEADERS.length).clearContent();
    branchSheet.getRange(2, 1, rows.length, DO_BRANCH_HEADERS.length).setValues(rows);
    branchSheet.setColumnWidth(1, 110); branchSheet.setColumnWidth(2, 320);
    branchSheet.setColumnWidth(3, 150); branchSheet.setColumnWidth(4, 150);

    const dataSheet = ensureDoSheet(spreadsheet, DO_DELIVERY_CONFIG.dataSheet, DO_DATA_HEADERS);
    let updatedDoRows = 0;
    if (dataSheet.getLastRow() >= 2) {
      const data = dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, DO_DATA_HEADERS.length).getValues();
      data.forEach(function(row) {
        const master = unique[String(row[4] || "").trim()];
        if (!master) return;
        row[5] = master[1]; row[6] = master[2]; row[7] = master[3]; row[11] = String(userCode || ""); row[12] = now;
        updatedDoRows += 1;
      });
      dataSheet.getRange(2, 1, data.length, DO_DATA_HEADERS.length).setValues(data);
    }
    rebuildDoDashboard(spreadsheet, dataSheet, branchSheet);
    SpreadsheetApp.flush();
    return { branchCount: rows.length, updatedDoRows: updatedDoRows, spreadsheetUrl: spreadsheet.getUrl() };
  } finally {
    lock.releaseLock();
  }
}

function normalizeDoRegion(value) {
  const region = String(value || "").trim().replace(/^ภาค/, "");
  if (region === "ตะวันออกเฉียงเหนือ") return "อีสาน";
  return region;
}

function saveDoDelivery(input, userCode) {
  const payload = input || {};
  const records = Array.isArray(payload.records) ? payload.records : [];
  const files = Array.isArray(payload.files) ? payload.files : [];
  if (!records.length) throw new Error("ไม่พบข้อมูล DO สำหรับบันทึก");

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ensureDoSheet(spreadsheet, DO_DELIVERY_CONFIG.dataSheet, DO_DATA_HEADERS);
    const branchSheet = ensureDoSheet(spreadsheet, DO_DELIVERY_CONFIG.branchSheet, DO_BRANCH_HEADERS);
    const historySheet = ensureDoSheet(spreadsheet, DO_DELIVERY_CONFIG.historySheet, DO_HISTORY_HEADERS);
    const existingSources = readDoExistingSources(historySheet);
    const acceptedSources = {};
    files.forEach(function(file) {
      const sourceId = String(file.source_id || "").trim();
      if (sourceId && !existingSources[sourceId]) acceptedSources[sourceId] = file;
    });

    const branchMaster = readDoBranchMaster(branchSheet);
    const now = new Date();
    const acceptedRecords = [];
    records.forEach(function(record) {
      const sourceId = String(record.source_id || "").trim();
      if (!acceptedSources[sourceId]) return;
      acceptedRecords.push(record);
    });

    const monthlyUpdates = {};
    acceptedRecords.forEach(function(record) {
      const branchCode = String(record.branch_code || "").trim();
      const branch = branchMaster[branchCode] || {};
      const key = [record.year, record.month, record.warehouse_code, branchCode, record.product_code].join("|");
      if (!monthlyUpdates[key]) monthlyUpdates[key] = {
        year: Number(record.year || 0), month: Number(record.month || 0), warehouse: String(record.warehouse_code || ""),
        branchCode: branchCode, branchName: String(record.branch_name || branch.name || ""),
        province: String(branch.province || ""), region: String(branch.region || ""),
        productCode: String(record.product_code || ""), productName: String(record.product_name || ""), quantity: 0,
      };
      monthlyUpdates[key].quantity += Number(record.quantity || 0);
    });

    if (acceptedRecords.length) {
      mergeDoMonthlyRows(dataSheet, monthlyUpdates, userCode, now);
      appendNewDoBranches(branchSheet, acceptedRecords, branchMaster, now);
    }

    const historyRows = [];
    files.forEach(function(file) {
      const sourceId = String(file.source_id || "").trim();
      if (!sourceId) return;
      historyRows.push([
        sourceId, String(file.name || ""), Number(file.record_count || 0),
        existingSources[sourceId] ? "ไฟล์ซ้ำ - ข้าม" : "บันทึกแล้ว",
        String(userCode || ""), now,
      ]);
    });
    if (historyRows.length) historySheet.getRange(historySheet.getLastRow() + 1, 1, historyRows.length, DO_HISTORY_HEADERS.length).setValues(historyRows);

    const summary = rebuildDoDashboard(spreadsheet, dataSheet, branchSheet);
    SpreadsheetApp.flush();
    return {
      insertedCount: acceptedRecords.length,
      duplicateFileCount: files.filter(function(file) { return existingSources[String(file.source_id || "")]; }).length,
      totalRecords: Math.max(0, dataSheet.getLastRow() - 1),
      unresolvedBranchCount: summary.unresolvedBranchCount,
      spreadsheetUrl: spreadsheet.getUrl(),
    };
  } finally {
    lock.releaseLock();
  }
}

function ensureDoSheet(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setBackground("#0f766e").setFontColor("#ffffff").setFontWeight("bold");
  return sheet;
}

function readDoExistingSources(sheet) {
  const result = {};
  if (sheet.getLastRow() < 2) return result;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().forEach(function(row) { if (row[0]) result[row[0]] = true; });
  return result;
}

function readDoBranchMaster(sheet) {
  const result = {};
  if (sheet.getLastRow() < 2) return result;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, DO_BRANCH_HEADERS.length).getValues().forEach(function(row) {
    const code = String(row[0] || "").trim();
    if (code) result[code] = { name: row[1], province: row[2], region: row[3], latitude: row[4], longitude: row[5] };
  });
  return result;
}

function appendNewDoBranches(sheet, records, existing, now) {
  const pending = {};
  records.forEach(function(record) {
    const code = String(record.branch_code || "").trim();
    if (code && !existing[code]) pending[code] = String(record.branch_name || "");
  });
  const rows = Object.keys(pending).sort().map(function(code) { return [code, pending[code], "", "", "", "", now]; });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, DO_BRANCH_HEADERS.length).setValues(rows);
}

function mergeDoMonthlyRows(sheet, updates, userCode, now) {
  const merged = {};
  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, DO_DATA_HEADERS.length).getValues().forEach(function(row) {
      const key = String(row[0] || "").trim();
      if (key) merged[key] = row;
    });
  }
  Object.keys(updates).forEach(function(key) {
    const item = updates[key], current = merged[key];
    const quantity = Number(item.quantity || 0) + Number(current ? current[10] : 0);
    merged[key] = [key, item.year, item.month, item.warehouse, item.branchCode, item.branchName,
      item.province, item.region, item.productCode, item.productName, quantity, String(userCode || ""), now];
  });
  const rows = Object.keys(merged).sort().map(function(key) { return merged[key]; });
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, DO_DATA_HEADERS.length).clearContent();
  if (rows.length) sheet.getRange(2, 1, rows.length, DO_DATA_HEADERS.length).setValues(rows);
}

function rebuildDoDashboard(spreadsheet, dataSheet, branchSheet) {
  const dashboard = spreadsheet.getSheetByName(DO_DELIVERY_CONFIG.dashboardSheet) || spreadsheet.insertSheet(DO_DELIVERY_CONFIG.dashboardSheet);
  dashboard.clear();
  dashboard.getCharts().forEach(function(chart) { dashboard.removeChart(chart); });
  const branches = readDoBranchMaster(branchSheet);
  const rows = dataSheet.getLastRow() < 2 ? [] : dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, DO_DATA_HEADERS.length).getValues();
  const byBranch = {}, byWarehouse = {}, byRegion = {};
  let total = 0;
  rows.forEach(function(row) {
    const quantity = Number(row[10] || 0), branchCode = String(row[4] || ""), warehouse = String(row[3] || "");
    const master = branches[branchCode] || {};
    const region = String(master.region || row[7] || "รอระบุพื้นที่");
    total += quantity;
    if (!byBranch[branchCode]) byBranch[branchCode] = { name: String(row[5] || master.name || ""), quantity: 0, region: region };
    byBranch[branchCode].quantity += quantity;
    byWarehouse[warehouse] = (byWarehouse[warehouse] || 0) + quantity;
    byRegion[region] = (byRegion[region] || 0) + quantity;
  });
  const branchRows = Object.keys(byBranch).map(function(code) { return [code, byBranch[code].name, byBranch[code].region, byBranch[code].quantity]; }).sort(function(a, b) { return b[3] - a[3]; });
  const warehouseRows = Object.keys(byWarehouse).map(function(code) { return [code, byWarehouse[code]]; }).sort(function(a, b) { return b[1] - a[1]; });
  const regionRows = Object.keys(byRegion).map(function(region) { return [region, byRegion[region]]; }).sort(function(a, b) { return b[1] - a[1]; });

  dashboard.getRange("A1:H1").merge().setValue("Dashboard วิเคราะห์ยอดจัดส่ง DO").setBackground("#0f766e").setFontColor("#ffffff").setFontSize(18).setFontWeight("bold").setHorizontalAlignment("center");
  dashboard.getRange("A3:B3").setValues([["ยอดจัดส่งรวม (ชิ้น)", total]]);
  dashboard.getRange("D3:E3").setValues([["จำนวนสาขา", branchRows.length]]);
  dashboard.getRange("G3:H3").setValues([["อัปเดตล่าสุด", new Date()]]);
  dashboard.getRange("A5:D5").setValues([["รหัสสาขา", "ชื่อสาขา", "ภาค", "จำนวนจัดส่ง"]]).setBackground("#ccfbf1").setFontWeight("bold");
  if (branchRows.length) dashboard.getRange(6, 1, branchRows.length, 4).setValues(branchRows);
  dashboard.getRange("F5:G5").setValues([["คลัง", "จำนวนจัดส่ง"]]).setBackground("#cffafe").setFontWeight("bold");
  if (warehouseRows.length) dashboard.getRange(6, 6, warehouseRows.length, 2).setValues(warehouseRows);
  dashboard.getRange("I5:J5").setValues([["ภูมิภาค", "จำนวนจัดส่ง"]]).setBackground("#dbeafe").setFontWeight("bold");
  if (regionRows.length) dashboard.getRange(6, 9, regionRows.length, 2).setValues(regionRows);
  dashboard.setFrozenRows(5);
  dashboard.setColumnWidth(1, 110); dashboard.setColumnWidth(2, 300); dashboard.setColumnWidth(3, 150);
  dashboard.getRange(3, 2).setNumberFormat("#,##0");
  if (warehouseRows.length) {
    const chart = dashboard.newChart().setChartType(Charts.ChartType.COLUMN)
      .addRange(dashboard.getRange(5, 6, warehouseRows.length + 1, 2))
      .setPosition(5, 12, 0, 0).setOption("title", "ยอดจัดส่งแยกตามคลัง").build();
    dashboard.insertChart(chart);
  }
  return { unresolvedBranchCount: Object.keys(branches).filter(function(code) { return !String(branches[code].region || "").trim(); }).length };
}

function listDoDeliveryAnalytics(input) {
  const filters = input || {}, spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = ensureDoSheet(spreadsheet, DO_DELIVERY_CONFIG.dataSheet, DO_DATA_HEADERS);
  const branchSheet = ensureDoSheet(spreadsheet, DO_DELIVERY_CONFIG.branchSheet, DO_BRANCH_HEADERS);
  const master = readDoBranchMaster(branchSheet);
  const values = dataSheet.getLastRow() < 2 ? [] : dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, DO_DATA_HEADERS.length).getValues();
  const regionFilter = normalizeDoRegion(filters.region), provinceFilter = String(filters.province || "").trim();
  const yearFilter = Number(filters.year || 0), monthFilter = Number(filters.month || 0);
  const periods = {}, regions = {}, provinces = {}, branches = {}, products = {}, allBranches = {}, unresolved = {};
  let total = 0;
  values.forEach(function(row) {
    const year = Number(row[1] || 0), month = Number(row[2] || 0), branchCode = String(row[4] || "").trim();
    const branch = master[branchCode] || {};
    const province = String(branch.province || row[6] || "ยังไม่ระบุ").trim();
    const region = normalizeDoRegion(branch.region || row[7] || "ยังไม่ระบุ");
    const quantity = Number(row[10] || 0);
    if (year && month) periods[year + "|" + month] = { year: year, month: month, label: getDoMonthName(month) + " " + (year + 543) };
    if (yearFilter && year !== yearFilter) return;
    if (monthFilter && month !== monthFilter) return;
    if (regionFilter && region !== regionFilter) return;
    if (provinceFilter && province !== provinceFilter) return;
    total += quantity; allBranches[branchCode] = true;
    if (province === "ยังไม่ระบุ" || region === "ยังไม่ระบุ") unresolved[branchCode] = true;
    if (!regions[region]) regions[region] = { region: region, quantity: 0, provinces: {}, branches: {} };
    regions[region].quantity += quantity; regions[region].provinces[province] = true; regions[region].branches[branchCode] = true;
    const provinceKey = region + "|" + province;
    if (!provinces[provinceKey]) provinces[provinceKey] = { province: province, region: region, quantity: 0, branches: {} };
    provinces[provinceKey].quantity += quantity; provinces[provinceKey].branches[branchCode] = true;
    if (!branches[branchCode]) branches[branchCode] = { branchCode: branchCode, branchName: String(branch.name || row[5] || ""), province: province, region: region, quantity: 0 };
    branches[branchCode].quantity += quantity;
    const productCode = String(row[8] || "");
    if (!products[productCode]) products[productCode] = { productCode: productCode, productName: String(row[9] || ""), quantity: 0 };
    products[productCode].quantity += quantity;
  });
  const regionRows = Object.keys(regions).map(function(key) { const item = regions[key]; return { region: item.region, quantity: item.quantity, provinceCount: Object.keys(item.provinces).length, branchCount: Object.keys(item.branches).length }; }).sort(function(a, b) { return b.quantity - a.quantity; });
  const provinceRows = Object.keys(provinces).map(function(key) { const item = provinces[key]; return { province: item.province, region: item.region, quantity: item.quantity, branchCount: Object.keys(item.branches).length }; }).sort(function(a, b) { return b.quantity - a.quantity; });
  const branchRows = Object.keys(branches).map(function(key) { return branches[key]; }).sort(function(a, b) { return b.quantity - a.quantity; }).slice(0, 50);
  const productRows = Object.keys(products).map(function(key) { return products[key]; }).sort(function(a, b) { return b.quantity - a.quantity; }).slice(0, 20);
  return {
    totalQuantity: total, branchCount: Object.keys(allBranches).length,
    provinceCount: provinceRows.length, productCount: Object.keys(products).length,
    unresolvedBranchCount: Object.keys(unresolved).length,
    periods: Object.keys(periods).map(function(key) { return periods[key]; }).sort(function(a, b) { return b.year - a.year || b.month - a.month; }),
    regions: regionRows, provinces: provinceRows, topBranches: branchRows, topProducts: productRows,
    spreadsheetUrl: spreadsheet.getUrl(),
  };
}

function getDoMonthName(month) {
  return ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"][Number(month || 0)] || "";
}
