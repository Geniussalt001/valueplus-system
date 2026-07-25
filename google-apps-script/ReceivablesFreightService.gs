const RECEIVABLES_CONFIG = {
  TEMPLATE_SPREADSHEET_ID:
    "1zU-ALqCOMM2QjehlkKyNj1BPzdCPS-8rBm9iiIdhc9A",
  SHEET_NAME: "ลูกหนี้",
  START_ROW: 4,
  FOLDER_NAME: "ValuePlus ลูกหนี้-ค่าขนส่ง",
  TITLE_PREFIX:
    "ลูกหนี้ แวลู่พลัส รีเทล ประจำเดือน ",
  THAI_MONTHS: [
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
  ],
};

function saveReceivablesMonthly(input) {
  const records =
    input && Array.isArray(input.records)
      ? input.records
      : [];

  if (records.length === 0) {
    throw new Error(
      "ไม่พบข้อมูลลูกหนี้–ค่าขนส่งสำหรับบันทึก",
    );
  }

  const normalized =
    records.map(
      normalizeReceivablesRecord,
    );

  const period =
    resolveReceivablesPeriod(
      normalized,
    );

  const title =
    RECEIVABLES_CONFIG
      .TITLE_PREFIX +
    RECEIVABLES_CONFIG
      .THAI_MONTHS[
        period.month - 1
      ] +
    " " +
    period.buddhistYear;

  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    const folder =
      getReceivablesFolder();

    const monthlyFile =
      getOrCreateMonthlyReceivablesFile(
        folder,
        title,
      );

    const spreadsheet =
      SpreadsheetApp.openById(
        monthlyFile.file.getId(),
      );

    const sheet =
      spreadsheet.getSheetByName(
        RECEIVABLES_CONFIG
          .SHEET_NAME,
      );

    if (!sheet) {
      throw new Error(
        "ไม่พบชีต 'ลูกหนี้' ใน Template",
      );
    }

    const existing =
      readExistingReceivables(
        sheet,
      );

    const existingByInvoice = {};

    existing.forEach(
      function (record) {
        existingByInvoice[
          record.invoice
        ] = record;
      },
    );

    const inserted = [];
    const duplicates = [];

    normalized.forEach(
      function (record) {
        if (
          existingByInvoice[
            record.invoice
          ]
        ) {
          duplicates.push(
            record.invoice,
          );
          return;
        }

        existingByInvoice[
          record.invoice
        ] = record;

        inserted.push(
          record.invoice,
        );
      },
    );

    const merged =
      Object.keys(
        existingByInvoice,
      ).map(
        function (invoice) {
          return existingByInvoice[
            invoice
          ];
        },
      );

    const sequence =
      buildReceivablesSequence(
        merged,
      );

    writeReceivablesRows(
      sheet,
      sequence.rows,
    );

    SpreadsheetApp.flush();

    return {
      spreadsheetId:
        spreadsheet.getId(),
      spreadsheetUrl:
        spreadsheet.getUrl(),
      spreadsheetName:
        title,
      created:
        monthlyFile.created,
      sourceCount:
        normalized.length,
      insertedCount:
        inserted.length,
      duplicateCount:
        duplicates.length,
      duplicates: duplicates,
      missingCount:
        sequence.missingCount,
      firstInvoice:
        sequence.firstInvoice,
      lastInvoice:
        sequence.lastInvoice,
      month: period.month,
      buddhistYear:
        period.buddhistYear,
    };
  } finally {
    lock.releaseLock();
  }
}

function normalizeReceivablesRecord(
  record,
) {
  const invoice =
    String(
      record &&
        record.invoice
        ? record.invoice
        : "",
    )
      .trim()
      .toUpperCase();

  const invoiceParts =
    invoice.match(
      /^(VPR\d{4})(\d{3})$/,
    );

  if (!invoiceParts) {
    throw new Error(
      "รูปแบบ IV ไม่ถูกต้อง: " +
        (invoice || "-"),
    );
  }

  const date =
    String(
      record.date || "",
    ).trim();

  const parsedDate =
    parseReceivablesDate(
      date,
    );

  return {
    date: date,
    invoice: invoice,
    prefix: invoiceParts[1],
    sequence: Number(
      invoiceParts[2],
    ),
    sequenceWidth:
      invoiceParts[2].length,
    customer: String(
      record.customer || "",
    ).trim(),
    destination: String(
      record.destination || "",
    ).trim(),
    quantity: Number(
      record.quantity || 0,
    ),
    excVat: Number(
      record.exc_vat || 0,
    ),
    month: parsedDate.month,
    buddhistYear:
      parsedDate.buddhistYear,
  };
}

function parseReceivablesDate(value) {
  const match =
    String(value).match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    );

  if (!match) {
    throw new Error(
      "รูปแบบวันที่ไม่ถูกต้อง: " +
        value,
    );
  }

  const month =
    Number(match[2]);

  let year =
    Number(match[3]);

  if (
    month < 1 ||
    month > 12
  ) {
    throw new Error(
      "เดือนไม่ถูกต้อง: " +
        value,
    );
  }

  if (year < 2400) {
    year += 543;
  }

  return {
    month: month,
    buddhistYear: year,
  };
}

function resolveReceivablesPeriod(
  records,
) {
  const first = records[0];

  records.forEach(
    function (record) {
      if (
        record.month !==
          first.month ||
        record.buddhistYear !==
          first.buddhistYear
      ) {
        throw new Error(
          "ไฟล์ CSV มีข้อมูลมากกว่า 1 เดือน กรุณาแยกไฟล์ก่อนบันทึก",
        );
      }
    },
  );

  return {
    month: first.month,
    buddhistYear:
      first.buddhistYear,
  };
}

function getReceivablesFolder() {
  const properties =
    PropertiesService
      .getScriptProperties();

  const savedFolderId =
    properties.getProperty(
      "RECEIVABLES_FOLDER_ID",
    );

  if (savedFolderId) {
    try {
      return DriveApp.getFolderById(
        savedFolderId,
      );
    } catch (error) {
      properties.deleteProperty(
        "RECEIVABLES_FOLDER_ID",
      );
    }
  }

  const root =
    DriveApp.getRootFolder();

  const folders =
    root.getFoldersByName(
      RECEIVABLES_CONFIG
        .FOLDER_NAME,
    );

  const folder =
    folders.hasNext()
      ? folders.next()
      : root.createFolder(
          RECEIVABLES_CONFIG
            .FOLDER_NAME,
        );

  properties.setProperty(
    "RECEIVABLES_FOLDER_ID",
    folder.getId(),
  );

  return folder;
}

function getOrCreateMonthlyReceivablesFile(
  folder,
  title,
) {
  const files =
    folder.getFilesByName(title);

  while (files.hasNext()) {
    const file = files.next();

    if (
      file.getMimeType() ===
      MimeType.GOOGLE_SHEETS
    ) {
      return {
        file: file,
        created: false,
      };
    }
  }

  const template =
    DriveApp.getFileById(
      RECEIVABLES_CONFIG
        .TEMPLATE_SPREADSHEET_ID,
    );

  return {
    file: template.makeCopy(
      title,
      folder,
    ),
    created: true,
  };
}

function readExistingReceivables(
  sheet,
) {
  const lastRow =
    sheet.getLastRow();

  if (
    lastRow <
    RECEIVABLES_CONFIG.START_ROW
  ) {
    return [];
  }

  return sheet
    .getRange(
      RECEIVABLES_CONFIG.START_ROW,
      1,
      lastRow -
        RECEIVABLES_CONFIG
          .START_ROW +
        1,
      6,
    )
    .getDisplayValues()
    .filter(function (row) {
      return Boolean(
        String(
          row[1] || "",
        ).trim(),
      );
    })
    .map(function (row) {
      const invoice =
        String(row[1] || "")
          .trim()
          .toUpperCase();

      const match =
        invoice.match(
          /^(VPR\d{4})(\d{3})$/,
        );

      if (!match) {
        return null;
      }

      return {
        date: row[0],
        invoice: invoice,
        prefix: match[1],
        sequence: Number(
          match[2],
        ),
        sequenceWidth:
          match[2].length,
        customer: row[2],
        destination: row[3],
        quantity:
          parseSheetNumber(
            row[4],
          ),
        excVat:
          parseSheetNumber(
            row[5],
          ),
      };
    })
    .filter(Boolean);
}

function buildReceivablesSequence(
  records,
) {
  if (records.length === 0) {
    return {
      rows: [],
      missingCount: 0,
      firstInvoice: "",
      lastInvoice: "",
    };
  }

  records.sort(
    function (first, second) {
      return (
        first.sequence -
        second.sequence
      );
    },
  );

  const prefixes = {};

  records.forEach(
    function (record) {
      prefixes[record.prefix] =
        true;
    },
  );

  if (
    Object.keys(prefixes)
      .length !== 1
  ) {
    throw new Error(
      "พบเลข IV มากกว่า 1 ชุดเดือนในไฟล์เดียว",
    );
  }

  const prefix =
    records[0].prefix;

  const width =
    records[0].sequenceWidth;

  const bySequence = {};

  records.forEach(
    function (record) {
      bySequence[
        record.sequence
      ] = record;
    },
  );

  const first =
    records[0].sequence;

  const last =
    records[
      records.length - 1
    ].sequence;

  const rows = [];
  let missingCount = 0;

  for (
    let sequence = first;
    sequence <= last;
    sequence += 1
  ) {
    const record =
      bySequence[sequence];

    if (!record) {
      rows.push([
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

      missingCount += 1;
      continue;
    }

    rows.push([
      record.date,
      record.invoice,
      record.customer,
      record.destination,
      record.quantity,
      record.excVat,
    ]);
  }

  return {
    rows: rows,
    missingCount:
      missingCount,
    firstInvoice:
      prefix +
      String(first).padStart(
        width,
        "0",
      ),
    lastInvoice:
      prefix +
      String(last).padStart(
        width,
        "0",
      ),
  };
}

function writeReceivablesRows(
  sheet,
  rows,
) {
  if (rows.length === 0) {
    return;
  }

  const startRow =
    RECEIVABLES_CONFIG.START_ROW;

  const requiredLastRow =
    startRow + rows.length - 1;

  if (
    sheet.getMaxRows() <
    requiredLastRow
  ) {
    sheet.insertRowsAfter(
      sheet.getMaxRows(),
      requiredLastRow -
        sheet.getMaxRows(),
    );
  }

  const clearRowCount =
    Math.max(
      sheet.getLastRow() -
        startRow +
        1,
      rows.length,
      1,
    );

  sheet
    .getRange(
      startRow,
      1,
      clearRowCount,
      6,
    )
    .clearContent();

  sheet
    .getRange(
      startRow,
      1,
      rows.length,
      6,
    )
    .setValues(rows);

  sheet
    .getRange(
      startRow,
      1,
      rows.length,
      2,
    )
    .setNumberFormat("@");

  const formulaTemplate =
    sheet
      .getRange(
        startRow,
        7,
        1,
        6,
      )
      .getFormulasR1C1()[0];

  if (
    formulaTemplate.some(
      function (formula) {
        return Boolean(formula);
      },
    )
  ) {
    const formulas =
      rows.map(function () {
        return formulaTemplate
          .slice();
      });

    sheet
      .getRange(
        startRow,
        7,
        rows.length,
        6,
      )
      .setFormulasR1C1(
        formulas,
      );
  }
}

function parseSheetNumber(value) {
  const number =
    Number(
      String(value || "")
        .replace(/,/g, "")
        .trim(),
    );

  return Number.isFinite(number)
    ? number
    : 0;
}
