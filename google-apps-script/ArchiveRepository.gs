const PO_ARCHIVE_SHEET_NAME =
  "PO_ARCHIVE";

const PO_ARCHIVE_HEADERS = [
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

const MAX_ARCHIVE_PDF_SIZE_BYTES =
  8 * 1024 * 1024;

const THAI_MONTH_NAMES = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function listPoArchive() {
  const sheet =
    getPoArchiveSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      PO_ARCHIVE_HEADERS.length,
    )
    .getValues()
    .filter(function (row) {
      return Boolean(row[0]);
    })
    .map(mapPoArchiveRow)
    .reverse();
}

function uploadPoArchive(
  input,
  userCode,
) {
  validateArchiveUpload(input);

  const poNumber =
    normalizeText(
      input.poNumber,
    );

  const base64Data =
    String(
      input.base64Data || "",
    ).replace(
      /^data:application\/pdf;base64,/,
      "",
    );

  const fileBytes =
    Utilities.base64Decode(
      base64Data,
    );

  if (
    fileBytes.length >
    MAX_ARCHIVE_PDF_SIZE_BYTES
  ) {
    throw new Error(
      "ไฟล์ PDF ต้องมีขนาดไม่เกิน 8 MB",
    );
  }

  const documentDate =
    parseArchiveDate(
      input.documentDate,
    );

  const fileName =
    sanitizeFileName(
      input.fileName ||
        poNumber + ".pdf",
    );

  let destinationFolder;
  const prepareLock =
    LockService.getScriptLock();

  prepareLock.waitLock(30000);

  try {
    const duplicateRow =
      findArchiveRowByPoNumber(
        poNumber,
      );

    if (duplicateRow) {
      return createArchiveDuplicateResult(
        duplicateRow,
      );
    }

    destinationFolder =
      getArchiveDestinationFolder(
        documentDate,
      );

    const duplicateFiles =
      destinationFolder
        .getFilesByName(
          fileName,
        );

    if (duplicateFiles.hasNext()) {
      throw new Error(
        "พบชื่อไฟล์ซ้ำใน Google Drive: " +
          fileName,
      );
    }
  } finally {
    prepareLock.releaseLock();
  }

  const blob =
    Utilities.newBlob(
      fileBytes,
      "application/pdf",
      fileName,
    );

  const file =
    destinationFolder
      .createFile(blob);

  let rowCommitted = false;

  try {
    const commitLock =
      LockService.getScriptLock();

    commitLock.waitLock(30000);

    try {
      const duplicateRow =
        findArchiveRowByPoNumber(
          poNumber,
        );

      if (duplicateRow) {
        trashArchiveFileQuietly(
          file,
        );

        return createArchiveDuplicateResult(
          duplicateRow,
        );
      }

      const duplicateFiles =
        destinationFolder
          .getFilesByName(
            fileName,
          );

      while (duplicateFiles.hasNext()) {
        const duplicateFile =
          duplicateFiles.next();

        if (
          duplicateFile.getId() !==
          file.getId()
        ) {
          trashArchiveFileQuietly(
            file,
          );

          throw new Error(
            "พบชื่อไฟล์ซ้ำใน Google Drive: " +
              fileName,
          );
        }
      }

      const sheet =
        getPoArchiveSheet();
      const now =
        new Date();
      const id =
        "ARC-" +
        Utilities.getUuid()
          .split("-")[0]
          .toUpperCase();

      sheet.appendRow([
        id,
        poNumber,
        documentDate.value,
        cleanText(
          input.warehouse,
        ),
        file.getId(),
        file.getName(),
        file.getUrl(),
        fileBytes.length,
        now,
        userCode || "LOCAL",
        "stored",
        "",
      ]);

      const rowNumber =
        sheet.getLastRow();

      rowCommitted = true;

      return {
        status: "stored",
        message:
          "บันทึกไฟล์ขึ้น Google Drive สำเร็จ",
        record:
          getPoArchiveRecordByRow(
            rowNumber,
          ),
      };
    } finally {
      commitLock.releaseLock();
    }
  } catch (error) {
    if (!rowCommitted) {
      trashArchiveFileQuietly(
        file,
      );
    }

    throw error;
  }
}

function preparePoArchiveUpload(
  input,
) {
  if (
    !input ||
    !input.poNumber ||
    !input.documentDate ||
    !input.fileName
  ) {
    throw new Error(
      "ข้อมูลเตรียมอัปโหลดไม่ครบถ้วน",
    );
  }

  const poNumber =
    normalizeText(
      input.poNumber,
    );
  const duplicateRow =
    findArchiveRowByPoNumber(
      poNumber,
    );

  if (duplicateRow) {
    return {
      status: "duplicate",
      result:
        createArchiveDuplicateResult(
          duplicateRow,
        ),
    };
  }

  const documentDate =
    parseArchiveDate(
      input.documentDate,
    );
  const destinationFolder =
    getArchiveDestinationFolder(
      documentDate,
    );
  const fileName =
    sanitizeFileName(
      input.fileName,
    );
  const duplicateFiles =
    destinationFolder
      .getFilesByName(fileName);

  if (duplicateFiles.hasNext()) {
    throw new Error(
      "พบชื่อไฟล์ซ้ำใน Google Drive: " +
        fileName,
    );
  }

  return {
    status: "ready",
    folderId:
      destinationFolder.getId(),
    fileName: fileName,
  };
}

function registerPoArchiveUpload(
  input,
  userCode,
) {
  if (
    !input ||
    !input.fileId ||
    !input.poNumber ||
    !input.documentDate
  ) {
    throw new Error(
      "ข้อมูลยืนยันไฟล์อัปโหลดไม่ครบถ้วน",
    );
  }

  const poNumber =
    normalizeText(input.poNumber);
  const documentDate =
    parseArchiveDate(
      input.documentDate,
    );
  const file =
    DriveApp.getFileById(
      String(input.fileId),
    );

  if (
    file.getMimeType() !==
      "application/pdf" ||
    file.getSize() >
      MAX_ARCHIVE_PDF_SIZE_BYTES
  ) {
    trashArchiveFileQuietly(file);
    throw new Error(
      "ไฟล์ที่อัปโหลดไม่ใช่ PDF หรือมีขนาดเกิน 8 MB",
    );
  }

  const expectedFolder =
    getArchiveDestinationFolder(
      documentDate,
    );
  let belongsToFolder = false;
  const parents = file.getParents();

  while (parents.hasNext()) {
    if (
      parents.next().getId() ===
      expectedFolder.getId()
    ) {
      belongsToFolder = true;
      break;
    }
  }

  if (!belongsToFolder) {
    trashArchiveFileQuietly(file);
    throw new Error(
      "ตำแหน่งจัดเก็บไฟล์ไม่ถูกต้อง",
    );
  }

  const lock =
    LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const duplicateRow =
      findArchiveRowByPoNumber(
        poNumber,
      );

    if (duplicateRow) {
      const existing =
        getPoArchiveRecordByRow(
          duplicateRow,
        );

      if (
        existing.fileId ===
        file.getId()
      ) {
        return {
          status: "stored",
          message:
            "ยืนยันไฟล์ Google Drive แล้ว",
          record: existing,
        };
      }

      trashArchiveFileQuietly(file);
      return createArchiveDuplicateResult(
        duplicateRow,
      );
    }

    const sheet =
      getPoArchiveSheet();
    const now = new Date();
    const id =
      "ARC-" +
      Utilities.getUuid()
        .split("-")[0]
        .toUpperCase();

    sheet.appendRow([
      id,
      poNumber,
      documentDate.value,
      cleanText(input.warehouse),
      file.getId(),
      file.getName(),
      file.getUrl(),
      file.getSize(),
      now,
      userCode || "LOCAL",
      "stored",
      "",
    ]);

    return {
      status: "stored",
      message:
        "บันทึกไฟล์ขึ้น Google Drive สำเร็จ",
      record:
        getPoArchiveRecordByRow(
          sheet.getLastRow(),
        ),
    };
  } finally {
    lock.releaseLock();
  }
}

function createArchiveDuplicateResult(
  rowNumber,
) {
  return {
    status: "duplicate",
    message:
      "พบเลข PO นี้ในแฟ้มแล้ว ระบบไม่ได้บันทึกซ้ำ",
    record:
      getPoArchiveRecordByRow(
        rowNumber,
      ),
  };
}

function trashArchiveFileQuietly(
  file,
) {
  try {
    file.setTrashed(true);
  } catch (_error) {
    // A cleanup failure must not hide the original upload error.
  }
}

function getPoArchivePdf(
  input,
) {
  if (
    !input ||
    !input.id
  ) {
    throw new Error(
      "กรุณาระบุเอกสารที่ต้องการเปิด",
    );
  }

  const rowNumber =
    findArchiveRowById(
      input.id,
    );

  if (!rowNumber) {
    throw new Error(
      "ไม่พบเอกสารในแฟ้ม",
    );
  }

  const record =
    getPoArchiveRecordByRow(
      rowNumber,
    );

  const file =
    DriveApp.getFileById(
      record.fileId,
    );

  const bytes =
    file.getBlob()
      .getBytes();

  if (
    bytes.length >
    MAX_ARCHIVE_PDF_SIZE_BYTES
  ) {
    throw new Error(
      "ไฟล์มีขนาดใหญ่เกินกว่าที่ระบบ Preview ได้",
    );
  }

  return {
    fileId: file.getId(),
    fileName: file.getName(),
    mimeType:
      "application/pdf",
    base64Data:
      Utilities.base64Encode(
        bytes,
      ),
  };
}

function getPoArchiveSheet() {
  const spreadsheet =
    getSystemSpreadsheet();

  let sheet =
    spreadsheet.getSheetByName(
      PO_ARCHIVE_SHEET_NAME,
    );

  if (!sheet) {
    setupPoArchiveSystem();

    sheet =
      spreadsheet.getSheetByName(
        PO_ARCHIVE_SHEET_NAME,
      );
  }

  if (!sheet) {
    throw new Error(
      "ไม่สามารถสร้างชีต PO_ARCHIVE ได้",
    );
  }

  return sheet;
}

function findArchiveRowById(
  id,
) {
  return findArchiveRow(
    1,
    String(id || ""),
  );
}

function findArchiveRowByPoNumber(
  poNumber,
) {
  return findArchiveRow(
    2,
    normalizeText(
      poNumber,
    ),
  );
}

function findArchiveRow(
  column,
  target,
) {
  const sheet =
    getPoArchiveSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  const values =
    sheet
      .getRange(
        2,
        column,
        lastRow - 1,
        1,
      )
      .getValues()
      .flat();

  const normalizedTarget =
    String(target || "")
      .trim()
      .toUpperCase();

  const index =
    values.findIndex(
      function (value) {
        return (
          String(value || "")
            .trim()
            .toUpperCase() ===
          normalizedTarget
        );
      },
    );

  return index === -1
    ? null
    : index + 2;
}

function getPoArchiveRecordByRow(
  rowNumber,
) {
  const row =
    getPoArchiveSheet()
      .getRange(
        rowNumber,
        1,
        1,
        PO_ARCHIVE_HEADERS.length,
      )
      .getValues()[0];

  return mapPoArchiveRow(
    row,
  );
}

function mapPoArchiveRow(row) {
  return {
    id:
      String(row[0] || ""),
    poNumber:
      String(row[1] || ""),
    documentDate:
      formatDateValue(
        row[2],
        "yyyy-MM-dd",
      ),
    warehouse:
      String(row[3] || ""),
    fileId:
      String(row[4] || ""),
    fileName:
      String(row[5] || ""),
    fileUrl:
      String(row[6] || ""),
    fileSize:
      Number(row[7] || 0),
    uploadedAt:
      formatDateValue(
        row[8],
        "yyyy-MM-dd'T'HH:mm:ss",
      ),
    uploadedBy:
      String(row[9] || ""),
    status:
      String(
        row[10] ||
          "stored",
      ),
    note:
      String(row[11] || ""),
  };
}

function getArchiveDestinationFolder(
  documentDate,
) {
  const rootFolderId =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        "PDF_FOLDER_ID",
      );

  if (!rootFolderId) {
    throw new Error(
      "ยังไม่ได้ตั้งค่าโฟลเดอร์ PDF กรุณารัน setupSystem()",
    );
  }

  let folder =
    DriveApp.getFolderById(
      rootFolderId,
    );

  folder =
    findOrCreateFolder(
      folder,
      "Po Cpall",
    );

  folder =
    findOrCreateFolder(
      folder,
      String(
        documentDate
          .buddhistYear,
      ),
    );

  folder =
    findOrCreateFolder(
      folder,
      THAI_MONTH_NAMES[
        documentDate.month - 1
      ],
    );

  return findOrCreateFolder(
    folder,
    String(
      documentDate.day,
    ).padStart(2, "0"),
  );
}

function findOrCreateFolder(
  parent,
  name,
) {
  const folders =
    parent.getFoldersByName(
      name,
    );

  if (folders.hasNext()) {
    return folders.next();
  }

  return parent.createFolder(
    name,
  );
}

function parseArchiveDate(
  value,
) {
  const match =
    String(value || "")
      .trim()
      .match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      );

  if (!match) {
    throw new Error(
      "รูปแบบวันที่เอกสารไม่ถูกต้อง: " +
        value,
    );
  }

  const day =
    Number(match[1]);

  const month =
    Number(match[2]);

  const sourceYear =
    Number(match[3]);

  const gregorianYear =
    sourceYear >= 2400
      ? sourceYear - 543
      : sourceYear;

  const testDate =
    new Date(
      gregorianYear,
      month - 1,
      day,
    );

  if (
    testDate.getFullYear() !==
      gregorianYear ||
    testDate.getMonth() !==
      month - 1 ||
    testDate.getDate() !==
      day
  ) {
    throw new Error(
      "วันที่เอกสารไม่ถูกต้อง: " +
        value,
    );
  }

  return {
    day: day,
    month: month,
    gregorianYear:
      gregorianYear,
    buddhistYear:
      gregorianYear + 543,
    value: testDate,
  };
}

function validateArchiveUpload(
  input,
) {
  if (!input) {
    throw new Error(
      "ไม่พบข้อมูลเอกสาร",
    );
  }

  if (
    !normalizeText(
      input.poNumber,
    )
  ) {
    throw new Error(
      "ไม่พบเลข PO",
    );
  }

  if (
    !input.documentDate
  ) {
    throw new Error(
      "ไม่พบวันที่เอกสาร",
    );
  }

  if (
    !cleanText(
      input.warehouse,
    )
  ) {
    throw new Error(
      "ไม่พบชื่อคลัง",
    );
  }

  if (
    !String(
      input.fileName || "",
    )
      .toLowerCase()
      .endsWith(".pdf")
  ) {
    throw new Error(
      "รองรับเฉพาะไฟล์ PDF เท่านั้น",
    );
  }

  if (
    !input.base64Data
  ) {
    throw new Error(
      "ไม่พบข้อมูลไฟล์ PDF",
    );
  }
}
