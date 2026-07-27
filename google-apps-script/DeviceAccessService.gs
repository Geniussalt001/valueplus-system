const DEVICE_ACCESS_SHEET =
  "DEVICE_ACCESS";

const DEVICE_ACCESS_HEADERS = [
  "TOKEN_HASH",
  "DEVICE_NAME",
  "CREATED_AT",
  "LAST_USED_AT",
  "ACTIVE",
];

function activateValuePlusDevice(input) {
  const activationCode =
    String(
      input &&
        input.activationCode ||
        "",
    ).trim();

  const expectedCode =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        "ACTIVATION_CODE",
      );

  if (!expectedCode) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า ACTIVATION_CODE ใน Script Properties",
    );
  }

  if (
    !secureDeviceValueEquals(
      activationCode,
      expectedCode,
    )
  ) {
    throw new Error(
      "รหัสเปิดใช้งานไม่ถูกต้อง",
    );
  }

  const deviceToken =
    createDeviceToken();

  const sheet =
    getDeviceAccessSheet();

  sheet.appendRow([
    hashDeviceValue(
      deviceToken,
    ),
    String(
      input.deviceName ||
        "ValuePlus Windows",
    ).trim(),
    new Date(),
    new Date(),
    true,
  ]);

  return {
    deviceToken: deviceToken,
    activatedAt:
      new Date().toISOString(),
  };
}

function verifyDeviceToken(token) {
  const normalized =
    String(token || "").trim();

  if (!normalized) {
    return false;
  }

  const tokenHash =
    hashDeviceValue(normalized);

  const cache =
    CacheService
      .getScriptCache();

  if (
    cache.get(
      "device:" + tokenHash,
    ) === "1"
  ) {
    return true;
  }

  const sheet =
    getDeviceAccessSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return false;
  }

  const rows = sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      DEVICE_ACCESS_HEADERS
        .length,
    )
    .getValues();

  for (
    let index = 0;
    index < rows.length;
    index += 1
  ) {
    const row = rows[index];
    const active =
      row[4] === true ||
      String(row[4])
        .toLowerCase() ===
        "true";

    if (
      active &&
      secureDeviceValueEquals(
        String(row[0] || ""),
        tokenHash,
      )
    ) {
      sheet
        .getRange(
          index + 2,
          4,
        )
        .setValue(new Date());

      cache.put(
        "device:" + tokenHash,
        "1",
        600,
      );

      return true;
    }
  }

  return false;
}

function setupDeviceAccessSystem() {
  const sheet =
    getDeviceAccessSheet();

  Logger.log(
    "เตรียมระบบเปิดใช้งานเครื่องสำเร็จ: " +
      sheet.getName(),
  );

  return {
    success: true,
    sheetName:
      DEVICE_ACCESS_SHEET,
  };
}

function getDeviceAccessSheet() {
  const spreadsheet =
    getSystemSpreadsheet();

  let sheet =
    spreadsheet.getSheetByName(
      DEVICE_ACCESS_SHEET,
    );

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(
        DEVICE_ACCESS_SHEET,
      );
  }

  if (
    sheet.getMaxColumns() <
    DEVICE_ACCESS_HEADERS.length
  ) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      DEVICE_ACCESS_HEADERS
        .length -
        sheet.getMaxColumns(),
    );
  }

  sheet
    .getRange(
      1,
      1,
      1,
      DEVICE_ACCESS_HEADERS
        .length,
    )
    .setValues([
      DEVICE_ACCESS_HEADERS,
    ])
    .setBackground("#062d46")
    .setFontColor("#67e8f9")
    .setFontWeight("bold");

  sheet.setFrozenRows(1);

  return sheet;
}

function createDeviceToken() {
  return (
    Utilities.getUuid()
      .replace(/-/g, "") +
    Utilities.getUuid()
      .replace(/-/g, "") +
    Utilities.getUuid()
      .replace(/-/g, "")
  );
}

function hashDeviceValue(value) {
  const digest =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm
        .SHA_256,
      String(value || ""),
      Utilities.Charset.UTF_8,
    );

  return digest
    .map(function (byte) {
      const normalized =
        byte < 0
          ? byte + 256
          : byte;

      return normalized
        .toString(16)
        .padStart(2, "0");
    })
    .join("");
}

function secureDeviceValueEquals(
  first,
  second,
) {
  const valueA =
    String(first || "");
  const valueB =
    String(second || "");

  if (
    valueA.length !==
    valueB.length
  ) {
    return false;
  }

  let difference = 0;

  for (
    let index = 0;
    index < valueA.length;
    index += 1
  ) {
    difference |=
      valueA.charCodeAt(index) ^
      valueB.charCodeAt(index);
  }

  return difference === 0;
}
