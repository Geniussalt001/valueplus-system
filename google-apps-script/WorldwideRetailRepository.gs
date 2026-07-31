const WORLDWIDE_RETAIL_SHEET_NAME =
  "WORLDWIDE_RETAIL";

const WORLDWIDE_RETAIL_HEADERS = [
  "ID",
  "IV_NUMBER",
  "PO_NUMBER",
  "SO_NUMBER",
  "DOCUMENT_DATE",
  "PO_FILE_ID",
  "PO_FILE_NAME",
  "PO_FILE_URL",
  "PO_FILE_SIZE",
  "IV_FILE_ID",
  "IV_FILE_NAME",
  "IV_FILE_URL",
  "IV_FILE_SIZE",
  "UPLOADED_AT",
  "UPLOADED_BY",
  "ACK_STATUS",
  "ACK_AT",
  "ACK_BY",
  "ACK_NOTE",
];

const MAX_WORLDWIDE_PDF_SIZE_BYTES =
  8 * 1024 * 1024;

const WORLDWIDE_MONTH_NAMES = [
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

function listWorldwideRetail() {
  const sheet =
    getWorldwideRetailSheet();

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
      WORLDWIDE_RETAIL_HEADERS.length,
    )
    .getValues()
    .filter(function (row) {
      return Boolean(row[0]);
    })
    .map(mapWorldwideRetailRow)
    .reverse();
}

function uploadWorldwideRetail(
  input,
  userCode,
) {
  validateWorldwideRetailUpload(
    input,
  );

  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    const sheet =
      getWorldwideRetailSheet();

    const ivNumber =
      normalizeText(
        input.ivNumber,
      );

    const poNumber =
      normalizeText(
        input.poNumber,
      );

    const soNumber =
      normalizeText(
        input.soNumber,
      );

    const duplicateRow =
      findWorldwideRetailDuplicate(
        ivNumber,
        poNumber,
        soNumber,
      );

    if (duplicateRow) {
      throw new Error(
        "พบเลข IV, PO และ SO ชุดนี้ในแฟ้มแล้ว",
      );
    }

    const documentDate =
      parseArchiveDate(
        input.documentDate,
      );

    const destinationFolder =
      getWorldwideRetailFolder(
        documentDate,
      );

    const poPdf =
      decodeWorldwidePdf(
        input.poFile,
        "PO",
      );

    const ivPdf =
      decodeWorldwidePdf(
        input.ivFile,
        "IV",
      );

    const poFileName =
      buildWorldwideFileName(
        poNumber + "-PO.pdf",
      );

    const ivFileName =
      buildWorldwideFileName(
        ivNumber + "-IV.pdf",
      );

    ensureWorldwideFileNameAvailable(
      destinationFolder,
      poFileName,
    );

    ensureWorldwideFileNameAvailable(
      destinationFolder,
      ivFileName,
    );

    let poFile = null;
    let ivFile = null;

    try {
      poFile =
        destinationFolder.createFile(
          Utilities.newBlob(
            poPdf.bytes,
            "application/pdf",
            poFileName,
          ),
        );

      ivFile =
        destinationFolder.createFile(
          Utilities.newBlob(
            ivPdf.bytes,
            "application/pdf",
            ivFileName,
          ),
        );
    } catch (error) {
      if (poFile) {
        poFile.setTrashed(true);
      }

      if (ivFile) {
        ivFile.setTrashed(true);
      }

      throw error;
    }

    const now =
      new Date();

    const id =
      "WW-" +
      Utilities.getUuid()
        .split("-")[0]
        .toUpperCase();

    sheet.appendRow([
      id,
      ivNumber,
      poNumber,
      soNumber,
      documentDate.value,
      poFile.getId(),
      poFile.getName(),
      poFile.getUrl(),
      poPdf.bytes.length,
      ivFile.getId(),
      ivFile.getName(),
      ivFile.getUrl(),
      ivPdf.bytes.length,
      now,
      userCode || "OFFICE",
      "pending",
      "",
      "",
      "",
    ]);

    return getWorldwideRetailRecordByRow(
      sheet.getLastRow(),
    );
  } finally {
    lock.releaseLock();
  }
}

function acknowledgeWorldwideRetail(
  input,
  userCode,
) {
  if (
    !input ||
    !input.id
  ) {
    throw new Error(
      "กรุณาระบุรายการที่ต้องการตอบรับ",
    );
  }

  const status =
    String(
      input.status || "",
    )
      .trim()
      .toLowerCase();

  if (
    [
      "received",
      "rejected",
    ].indexOf(status) === -1
  ) {
    throw new Error(
      "สถานะตอบรับไม่ถูกต้อง",
    );
  }

  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    const rowNumber =
      findWorldwideRetailRowById(
        input.id,
      );

    if (!rowNumber) {
      throw new Error(
        "ไม่พบรายการรีเทลขายเวิร์ลไวด์",
      );
    }

    const sheet =
      getWorldwideRetailSheet();

    sheet
      .getRange(
        rowNumber,
        16,
        1,
        4,
      )
      .setValues([[
        status,
        new Date(),
        userCode || "HEADOFFICE",
        cleanText(
          input.note,
        ),
      ]]);

    return getWorldwideRetailRecordByRow(
      rowNumber,
    );
  } finally {
    lock.releaseLock();
  }
}

function getWorldwideRetailSheet() {
  const spreadsheet =
    getSystemSpreadsheet();

  let sheet =
    spreadsheet.getSheetByName(
      WORLDWIDE_RETAIL_SHEET_NAME,
    );

  if (!sheet) {
    setupWorldwideRetailSystem();

    sheet =
      spreadsheet.getSheetByName(
        WORLDWIDE_RETAIL_SHEET_NAME,
      );
  }

  if (!sheet) {
    throw new Error(
      "ไม่สามารถสร้างชีต WORLDWIDE_RETAIL ได้",
    );
  }

  return sheet;
}

function findWorldwideRetailDuplicate(
  ivNumber,
  poNumber,
  soNumber,
) {
  const sheet =
    getWorldwideRetailSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  const values =
    sheet
      .getRange(
        2,
        2,
        lastRow - 1,
        3,
      )
      .getValues();

  const index =
    values.findIndex(
      function (row) {
        return (
          normalizeText(row[0]) ===
            ivNumber &&
          normalizeText(row[1]) ===
            poNumber &&
          normalizeText(row[2]) ===
            soNumber
        );
      },
    );

  return index === -1
    ? null
    : index + 2;
}

function findWorldwideRetailRowById(
  id,
) {
  const sheet =
    getWorldwideRetailSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  const target =
    String(id || "")
      .trim()
      .toUpperCase();

  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        1,
      )
      .getValues()
      .flat();

  const index =
    values.findIndex(
      function (value) {
        return (
          String(value || "")
            .trim()
            .toUpperCase() ===
          target
        );
      },
    );

  return index === -1
    ? null
    : index + 2;
}

function getWorldwideRetailRecordByRow(
  rowNumber,
) {
  const row =
    getWorldwideRetailSheet()
      .getRange(
        rowNumber,
        1,
        1,
        WORLDWIDE_RETAIL_HEADERS.length,
      )
      .getValues()[0];

  return mapWorldwideRetailRow(
    row,
  );
}

function mapWorldwideRetailRow(row) {
  return {
    id:
      String(row[0] || ""),
    ivNumber:
      String(row[1] || ""),
    poNumber:
      String(row[2] || ""),
    soNumber:
      String(row[3] || ""),
    documentDate:
      formatDateValue(
        row[4],
        "yyyy-MM-dd",
      ),
    poFileId:
      String(row[5] || ""),
    poFileName:
      String(row[6] || ""),
    poFileUrl:
      String(row[7] || ""),
    poFileSize:
      Number(row[8] || 0),
    ivFileId:
      String(row[9] || ""),
    ivFileName:
      String(row[10] || ""),
    ivFileUrl:
      String(row[11] || ""),
    ivFileSize:
      Number(row[12] || 0),
    uploadedAt:
      formatDateValue(
        row[13],
        "yyyy-MM-dd'T'HH:mm:ss",
      ),
    uploadedBy:
      String(row[14] || ""),
    acknowledgementStatus:
      String(
        row[15] ||
          "pending",
      ),
    acknowledgedAt:
      formatDateValue(
        row[16],
        "yyyy-MM-dd'T'HH:mm:ss",
      ),
    acknowledgedBy:
      String(row[17] || ""),
    acknowledgementNote:
      String(row[18] || ""),
  };
}

function decodeWorldwidePdf(
  input,
  label,
) {
  if (
    !input ||
    !input.fileName ||
    !input.base64Data
  ) {
    throw new Error(
      "กรุณาอัปโหลดไฟล์ " +
        label +
        " เป็น PDF",
    );
  }

  if (
    !String(input.fileName)
      .toLowerCase()
      .endsWith(".pdf")
  ) {
    throw new Error(
      "ไฟล์ " +
        label +
        " ต้องเป็น PDF เท่านั้น",
    );
  }

  const base64Data =
    String(
      input.base64Data,
    ).replace(
      /^data:application\/pdf;base64,/,
      "",
    );

  const bytes =
    Utilities.base64Decode(
      base64Data,
    );

  if (
    bytes.length >
    MAX_WORLDWIDE_PDF_SIZE_BYTES
  ) {
    throw new Error(
      "ไฟล์ " +
        label +
        " ต้องมีขนาดไม่เกิน 8 MB",
    );
  }

  return {
    bytes: bytes,
  };
}

function getWorldwideRetailFolder(
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
      "Retail Worldwide",
    );

  folder =
    findOrCreateFolder(
      folder,
      String(
        documentDate
          .buddhistYear,
      ),
    );

  return findOrCreateFolder(
    folder,
    WORLDWIDE_MONTH_NAMES[
      documentDate.month - 1
    ],
  );
}

function ensureWorldwideFileNameAvailable(
  folder,
  fileName,
) {
  if (
    folder
      .getFilesByName(
        fileName,
      )
      .hasNext()
  ) {
    throw new Error(
      "พบชื่อไฟล์ซ้ำใน Google Drive: " +
        fileName,
    );
  }
}

function buildWorldwideFileName(
  value,
) {
  return sanitizeFileName(
    value,
  );
}

function validateWorldwideRetailUpload(
  input,
) {
  if (!input) {
    throw new Error(
      "ไม่พบข้อมูลรีเทลขายเวิร์ลไวด์",
    );
  }

  if (!normalizeText(input.ivNumber)) {
    throw new Error(
      "กรุณากรอกเลข IV",
    );
  }

  if (!normalizeText(input.poNumber)) {
    throw new Error(
      "กรุณากรอกเลข PO",
    );
  }

  if (!normalizeText(input.soNumber)) {
    throw new Error(
      "กรุณากรอกเลข SO",
    );
  }

  if (!input.documentDate) {
    throw new Error(
      "กรุณาเลือกวันที่เอกสาร",
    );
  }

  decodeWorldwidePdf(
    input.poFile,
    "PO",
  );

  decodeWorldwidePdf(
    input.ivFile,
    "IV",
  );
}
