const MONTHLY_SALES_CONFIG = {
  SUMMARY_SHEET_NAME:
    "ฐานข้อมูลสรุป",
  LOG_SHEET_NAME:
    "ประวัติอัปเดตยอดขาย",
  SUMMARY_HEADERS: [
    "ปี",
    "เดือนที่",
    "เดือน",
    "ประเภท",
    "รหัสสินค้า",
    "ชื่อสินค้า",
    "จำนวน",
    "อัปเดตเมื่อ",
    "อัปเดตโดย",
    "ไฟล์ต้นทาง",
  ],
  LOG_HEADERS: [
    "UPLOAD_ID",
    "อัปเดตเมื่อ",
    "อัปเดตโดย",
    "ปี-เดือน",
    "ไฟล์ต้นทาง",
    "จำนวนแถว",
    "ยอดขาย",
    "CN",
    "ยอดสุทธิ",
    "แถวเดิมที่แทนที่",
  ],
};

function saveMonthlySalesSnapshot(
  input,
  userCode,
) {
  const records =
    input &&
    Array.isArray(
      input.records,
    )
      ? input.records
      : [];

  if (records.length === 0) {
    throw new Error(
      "ไม่พบข้อมูลยอดขายรายเดือนสำหรับบันทึก",
    );
  }

  const normalized = records.map(
    normalizeMonthlySalesRecord,
  );

  const periodKeys = {};

  normalized.forEach(
    function (record) {
      periodKeys[
        record.year +
          "-" +
          String(
            record.month,
          ).padStart(2, "0")
      ] = true;
    },
  );

  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    const spreadsheet =
      getSystemSpreadsheet();

    const summarySheet =
      ensureMonthlySalesSheet(
        spreadsheet,
        MONTHLY_SALES_CONFIG
          .SUMMARY_SHEET_NAME,
        MONTHLY_SALES_CONFIG
          .SUMMARY_HEADERS,
      );

    const logSheet =
      ensureMonthlySalesSheet(
        spreadsheet,
        MONTHLY_SALES_CONFIG
          .LOG_SHEET_NAME,
        MONTHLY_SALES_CONFIG
          .LOG_HEADERS,
      );

    const existing =
      readMonthlySalesRows(
        summarySheet,
      );

    const retained =
      existing.filter(
        function (record) {
          const key =
            record.year +
            "-" +
            String(
              record.month,
            ).padStart(
              2,
              "0",
            );

          return !periodKeys[key];
        },
      );

    const replacedCount =
      existing.length -
      retained.length;

    const now = new Date();
    const sourceFiles =
      input &&
      Array.isArray(
        input.sourceFiles,
      )
        ? input.sourceFiles
            .map(String)
            .join(", ")
        : "";

    const incoming =
      normalized.map(
        function (record) {
          return Object.assign(
            {},
            record,
            {
              updatedAt: now,
              updatedBy:
                String(
                  userCode || "",
                ),
              sourceFiles:
                sourceFiles,
            },
          );
        },
      );

    const merged = retained
      .concat(incoming)
      .sort(
        compareMonthlySalesRows,
      );

    writeMonthlySalesRows(
      summarySheet,
      merged,
    );

    const totals =
      calculateMonthlySalesTotals(
        incoming,
      );

    const uploadId =
      Utilities.getUuid();

    logSheet.appendRow([
      uploadId,
      now,
      String(userCode || ""),
      Object.keys(periodKeys)
        .sort()
        .join(", "),
      sourceFiles,
      incoming.length,
      totals.sales,
      totals.cn,
      totals.net,
      replacedCount,
    ]);

    SpreadsheetApp.flush();

    return {
      uploadId: uploadId,
      spreadsheetId:
        spreadsheet.getId(),
      spreadsheetUrl:
        spreadsheet.getUrl(),
      sheetName:
        MONTHLY_SALES_CONFIG
          .SUMMARY_SHEET_NAME,
      sourceCount:
        incoming.length,
      replacedCount:
        replacedCount,
      totalRows:
        merged.length,
      periods:
        Object.keys(
          periodKeys,
        ).sort(),
      salesTotal:
        totals.sales,
      cnTotal:
        totals.cn,
      netTotal:
        totals.net,
      updatedAt:
        now.toISOString(),
    };
  } finally {
    lock.releaseLock();
  }
}

function listMonthlySalesSummary(
  input,
) {
  const spreadsheet =
    getSystemSpreadsheet();

  const sheet =
    ensureMonthlySalesSheet(
      spreadsheet,
      MONTHLY_SALES_CONFIG
        .SUMMARY_SHEET_NAME,
      MONTHLY_SALES_CONFIG
        .SUMMARY_HEADERS,
    );

  const year = Number(
    input && input.year,
  );
  const month = Number(
    input && input.month,
  );

  const records =
    readMonthlySalesRows(
      sheet,
    ).filter(
      function (record) {
        return (
          (!year ||
            record.year === year) &&
          (!month ||
            record.month === month)
        );
      },
    );

  return {
    spreadsheetId:
      spreadsheet.getId(),
    spreadsheetUrl:
      spreadsheet.getUrl(),
    sheetName:
      MONTHLY_SALES_CONFIG
        .SUMMARY_SHEET_NAME,
    records: records,
    totals:
      calculateMonthlySalesTotals(
        records,
      ),
  };
}

function normalizeMonthlySalesRecord(
  record,
) {
  const year = Number(
    record && record.year,
  );
  const month = Number(
    record && record.month,
  );
  const type = String(
    record && record.type,
  ).trim();
  const cpallCode = String(
    record &&
      record.cpall_code,
  ).trim();
  const productName = String(
    record &&
      record.product_name,
  ).trim();
  const quantity = Number(
    record && record.quantity,
  );

  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(
      "ปีหรือเดือนของยอดขายไม่ถูกต้อง",
    );
  }

  if (
    type !== "ขาย" &&
    type !== "CN"
  ) {
    throw new Error(
      "ประเภทยอดขายไม่ถูกต้อง: " +
        (type || "-"),
    );
  }

  if (
    !/^\d{7}$/.test(
      cpallCode,
    ) ||
    !productName ||
    !Number.isFinite(quantity)
  ) {
    throw new Error(
      "ข้อมูลสินค้าในยอดขายรายเดือนไม่ครบถ้วน",
    );
  }

  return {
    year: year,
    month: month,
    monthName:
      String(
        record.month_name || "",
      ).trim(),
    type: type,
    cpallCode: cpallCode,
    productName:
      productName,
    quantity: quantity,
  };
}

function ensureMonthlySalesSheet(
  spreadsheet,
  sheetName,
  headers,
) {
  let sheet =
    spreadsheet.getSheetByName(
      sheetName,
    );

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(
        sheetName,
      );
  }

  if (
    sheet.getMaxColumns() <
    headers.length
  ) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      headers.length -
        sheet.getMaxColumns(),
    );
  }

  sheet
    .getRange(
      1,
      1,
      1,
      headers.length,
    )
    .setValues([headers])
    .setBackground("#9f1239")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment(
      "center",
    );

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  return sheet;
}

function readMonthlySalesRows(
  sheet,
) {
  if (sheet.getLastRow() < 2) {
    return [];
  }

  return sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      MONTHLY_SALES_CONFIG
        .SUMMARY_HEADERS.length,
    )
    .getValues()
    .filter(function (row) {
      return Boolean(row[4]);
    })
    .map(function (row) {
      return {
        year: Number(row[0]),
        month: Number(row[1]),
        monthName:
          String(row[2] || ""),
        type:
          String(row[3] || ""),
        cpallCode:
          String(row[4] || ""),
        productName:
          String(row[5] || ""),
        quantity:
          Number(row[6] || 0),
        updatedAt: row[7],
        updatedBy:
          String(row[8] || ""),
        sourceFiles:
          String(row[9] || ""),
      };
    });
}

function writeMonthlySalesRows(
  sheet,
  records,
) {
  const bodyRows = Math.max(
    sheet.getLastRow() - 1,
    0,
  );

  if (bodyRows > 0) {
    sheet
      .getRange(
        2,
        1,
        bodyRows,
        MONTHLY_SALES_CONFIG
          .SUMMARY_HEADERS.length,
      )
      .clearContent();
  }

  if (records.length === 0) {
    return;
  }

  sheet
    .getRange(
      2,
      1,
      records.length,
      MONTHLY_SALES_CONFIG
        .SUMMARY_HEADERS.length,
    )
    .setValues(
      records.map(
        function (record) {
          return [
            record.year,
            record.month,
            record.monthName,
            record.type,
            record.cpallCode,
            record.productName,
            record.quantity,
            record.updatedAt,
            record.updatedBy,
            record.sourceFiles,
          ];
        },
      ),
    );

  sheet
    .getRange(
      2,
      5,
      records.length,
      1,
    )
    .setNumberFormat("@");

  sheet
    .getRange(
      2,
      7,
      records.length,
      1,
    )
    .setNumberFormat("#,##0.##");

  sheet
    .getRange(
      2,
      8,
      records.length,
      1,
    )
    .setNumberFormat(
      "dd/mm/yyyy hh:mm:ss",
    );

  const existingFilter =
    sheet.getFilter();

  if (existingFilter) {
    existingFilter.remove();
  }

  sheet.getDataRange()
    .createFilter();
}

function compareMonthlySalesRows(
  first,
  second,
) {
  return (
    first.year - second.year ||
    first.month - second.month ||
    first.cpallCode.localeCompare(
      second.cpallCode,
    ) ||
    first.type.localeCompare(
      second.type,
    )
  );
}

function calculateMonthlySalesTotals(
  records,
) {
  let sales = 0;
  let cn = 0;

  records.forEach(
    function (record) {
      if (record.type === "CN") {
        cn += Number(
          record.quantity || 0,
        );
      } else if (
        record.type === "ขาย"
      ) {
        sales += Number(
          record.quantity || 0,
        );
      }
    },
  );

  return {
    sales: sales,
    cn: cn,
    net: sales - cn,
  };
}
