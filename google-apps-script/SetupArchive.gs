function setupPoArchiveSystem() {
  const spreadsheet =
    getSystemSpreadsheet();

  const headers = [
    "ID",
    "PO_NUMBER",
    "DOCUMENT_DATE",
    "WAREHOUSE",
    "FILE_ID",
    "FILE_NAME",
    "FILE_URL",
    "FILE_SIZE",
    "UPLOADED_AT",
    "UPLOADED_BY",
    "STATUS",
    "NOTE",
  ];

  let sheet =
    spreadsheet.getSheetByName(
      "PO_ARCHIVE",
    );

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(
        "PO_ARCHIVE",
      );
  }

  const missingColumns =
    headers.length -
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
      headers.length,
    )
    .setValues([headers])
    .setBackground("#082f49")
    .setFontColor("#67e8f9")
    .setFontWeight("bold")
    .setHorizontalAlignment(
      "center",
    );

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  sheet
    .getRange(
      2,
      2,
      Math.max(
        sheet.getMaxRows() - 1,
        1,
      ),
      1,
    )
    .setNumberFormat("@");

  try {
    sheet.autoResizeColumns(
      1,
      headers.length,
    );
  } catch (error) {
    Logger.log(
      "ข้ามการปรับความกว้าง PO_ARCHIVE",
    );
  }

  SpreadsheetApp.flush();

  Logger.log(
    "ติดตั้งแฟ้มบันทึกข้อมูลสำเร็จ",
  );

  return {
    success: true,
    sheetName: "PO_ARCHIVE",
  };
}
