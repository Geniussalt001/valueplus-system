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
