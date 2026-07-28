const VALUEPLUS_NOTIFICATION_SHEET =
  "NOTIFICATIONS";

const VALUEPLUS_NOTIFICATION_HEADERS = [
  "ID",
  "TARGET_USER_CODE",
  "CATEGORY",
  "TITLE",
  "MESSAGE",
  "ENTITY_TYPE",
  "ENTITY_ID",
  "ARCHIVE_SECTION",
  "CREATED_AT",
  "CREATED_BY",
  "READ_AT",
  "READ_BY",
];

const VALUEPLUS_NOTIFICATION_LIMIT =
  100;

function createValuePlusNotification(
  input,
) {
  if (
    !input ||
    !input.title ||
    !input.archiveSection
  ) {
    throw new Error(
      "ข้อมูลแจ้งเตือนไม่ครบถ้วน",
    );
  }

  const sheet =
    getValuePlusNotificationSheet();

  const id =
    "NTF-" +
    Utilities.getUuid()
      .split("-")[0]
      .toUpperCase();

  sheet.appendRow([
    id,
    String(
      input.targetUserCode ||
        "HEADOFFICE",
    )
      .trim()
      .toUpperCase(),
    String(
      input.category ||
        "archive",
    ).trim(),
    String(input.title).trim(),
    String(
      input.message || "",
    ).trim(),
    String(
      input.entityType || "",
    ).trim(),
    String(
      input.entityId || "",
    ).trim(),
    String(
      input.archiveSection,
    ).trim(),
    new Date(),
    String(
      input.createdBy ||
        "OFFICE",
    ).trim(),
    "",
    "",
  ]);

  return id;
}

function listUnreadValuePlusNotifications(
  userCode,
) {
  const normalizedUserCode =
    normalizeNotificationUserCode(
      userCode,
    );

  const sheet =
    getValuePlusNotificationSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return {
      unreadCount: 0,
      notifications: [],
    };
  }

  const notifications =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        VALUEPLUS_NOTIFICATION_HEADERS
          .length,
      )
      .getValues()
      .filter(function (row) {
        return (
          String(row[1] || "")
            .trim()
            .toUpperCase() ===
            normalizedUserCode &&
          !row[10]
        );
      })
      .map(
        mapValuePlusNotification,
      )
      .reverse();

  return {
    unreadCount:
      notifications.length,
    notifications:
      notifications.slice(
        0,
        VALUEPLUS_NOTIFICATION_LIMIT,
      ),
  };
}

function markValuePlusNotificationRead(
  id,
  userCode,
) {
  const normalizedUserCode =
    normalizeNotificationUserCode(
      userCode,
    );

  const rowNumber =
    findValuePlusNotificationRow(
      id,
      normalizedUserCode,
    );

  if (!rowNumber) {
    throw new Error(
      "ไม่พบการแจ้งเตือน",
    );
  }

  getValuePlusNotificationSheet()
    .getRange(
      rowNumber,
      11,
      1,
      2,
    )
    .setValues([
      [
        new Date(),
        normalizedUserCode,
      ],
    ]);

  return listUnreadValuePlusNotifications(
    normalizedUserCode,
  );
}

function markAllValuePlusNotificationsRead(
  userCode,
) {
  const normalizedUserCode =
    normalizeNotificationUserCode(
      userCode,
    );

  const sheet =
    getValuePlusNotificationSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return {
      unreadCount: 0,
      notifications: [],
    };
  }

  const rows =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        VALUEPLUS_NOTIFICATION_HEADERS
          .length,
      )
      .getValues();

  const now =
    new Date();

  rows.forEach(
    function (row, index) {
      if (
        String(row[1] || "")
          .trim()
          .toUpperCase() ===
          normalizedUserCode &&
        !row[10]
      ) {
        sheet
          .getRange(
            index + 2,
            11,
            1,
            2,
          )
          .setValues([
            [
              now,
              normalizedUserCode,
            ],
          ]);
      }
    },
  );

  return {
    unreadCount: 0,
    notifications: [],
  };
}

function getValuePlusNotificationSheet() {
  const spreadsheet =
    getSystemSpreadsheet();

  let sheet =
    spreadsheet.getSheetByName(
      VALUEPLUS_NOTIFICATION_SHEET,
    );

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(
        VALUEPLUS_NOTIFICATION_SHEET,
      );
  }

  const missingColumns =
    VALUEPLUS_NOTIFICATION_HEADERS
      .length -
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
      VALUEPLUS_NOTIFICATION_HEADERS
        .length,
    )
    .setValues([
      VALUEPLUS_NOTIFICATION_HEADERS,
    ])
    .setBackground("#073652")
    .setFontColor("#67e8f9")
    .setFontWeight("bold");

  sheet.setFrozenRows(1);

  return sheet;
}

function findValuePlusNotificationRow(
  id,
  userCode,
) {
  const sheet =
    getValuePlusNotificationSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  const rows =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        2,
      )
      .getValues();

  const index =
    rows.findIndex(
      function (row) {
        return (
          String(row[0]) ===
            String(id) &&
          String(row[1] || "")
            .trim()
            .toUpperCase() ===
            userCode
        );
      },
    );

  return index === -1
    ? null
    : index + 2;
}

function mapValuePlusNotification(
  row,
) {
  return {
    id: String(row[0] || ""),
    category: String(
      row[2] || "",
    ),
    title: String(row[3] || ""),
    message: String(
      row[4] || "",
    ),
    entityType: String(
      row[5] || "",
    ),
    entityId: String(
      row[6] || "",
    ),
    archiveSection: String(
      row[7] || "",
    ),
    createdAt:
      formatValuePlusNotificationDate(
        row[8],
      ),
    createdBy: String(
      row[9] || "",
    ),
    readAt:
      formatValuePlusNotificationDate(
        row[10],
      ),
    readBy: String(
      row[11] || "",
    ),
  };
}

function formatValuePlusNotificationDate(
  value,
) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    const timezone =
      typeof CONFIG !==
        "undefined" &&
      CONFIG.TIMEZONE
        ? CONFIG.TIMEZONE
        : "Asia/Bangkok";

    return Utilities.formatDate(
      value,
      timezone,
      "yyyy-MM-dd'T'HH:mm:ssXXX",
    );
  }

  return String(value);
}

function normalizeNotificationUserCode(
  userCode,
) {
  const normalized =
    String(userCode || "")
      .trim()
      .toUpperCase();

  if (!normalized) {
    throw new Error(
      "ไม่พบผู้รับการแจ้งเตือน",
    );
  }

  return normalized;
}
