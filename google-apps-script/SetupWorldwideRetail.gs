function setupWorldwideRetailSystem() {
  const spreadsheet =
    getSystemSpreadsheet();

  let sheet =
    spreadsheet.getSheetByName(
      "WORLDWIDE_RETAIL",
    );

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(
        "WORLDWIDE_RETAIL",
      );
  }

  const missingColumns =
    WORLDWIDE_RETAIL_HEADERS.length -
    sheet.getMaxColumns();

  if (missingColumns > 0) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      missingColumns,
    );
  }

  sheet
    .getRange(
      1,
      1,
      1,
      WORLDWIDE_RETAIL_HEADERS.length,
    )
    .setValues([
      WORLDWIDE_RETAIL_HEADERS,
    ])
    .setBackground("#4338ca")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment(
      "center",
    );

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(4);

  sheet
    .getRange(
      2,
      2,
      Math.max(
        sheet.getMaxRows() - 1,
        1,
      ),
      3,
    )
    .setNumberFormat("@");

  try {
    sheet.autoResizeColumns(
      1,
      WORLDWIDE_RETAIL_HEADERS.length,
    );
  } catch (error) {
    Logger.log(
      "ข้ามการปรับความกว้าง WORLDWIDE_RETAIL",
    );
  }

  SpreadsheetApp.flush();

  Logger.log(
    "ติดตั้งแฟ้ม Retail Worldwide สำเร็จ",
  );

  return {
    success: true,
    sheetName:
      "WORLDWIDE_RETAIL",
  };
}
