function doGet() {
  return createJsonResponse({
    success: true,
    message:
      "ValuePlus API is running",
    timestamp:
      new Date().toISOString(),
  });
}

function doPost(event) {
  let request = null;

  try {
    request =
      parseRequest(event);

    if (
      request.action ===
      "system.activate"
    ) {
      const replayedActivation =
        getCachedRequestResult(
          request,
        );

      if (replayedActivation) {
        return createJsonResponse(
          replayedActivation,
        );
      }

      return createRequestResponse(
        request,
        {
          success: true,
          data:
            activateValuePlusDevice(
              request.data,
            ),
        },
      );
    }

    verifyApiToken(
      request.token,
    );

    const publicReplayActions = [
      "auth.select",
      "auth.login",
      "archive.uploadPdf",
    ];

    const replayedPublicAction =
      publicReplayActions.indexOf(
        String(
          request.action || "",
        ),
      ) !== -1
        ? getCachedRequestResult(
            request,
          )
        : null;

    if (replayedPublicAction) {
      return createJsonResponse(
        replayedPublicAction,
      );
    }

    if (
      request.action ===
      "auth.select"
    ) {
      const selectedSession =
        selectUserSession(
          request.data,
        );

      return createRequestResponse(
        request,
        {
          success: true,
          data: selectedSession,
        },
      );
    }

    if (
      request.action ===
      "auth.login"
    ) {
      const loginResult =
        authenticateUser(
          request.data,
        );

      return createRequestResponse(
        request,
        {
          success: true,
          data: loginResult,
        },
      );
    }

    /*
     * PO archive uploads are kept compatible with the current
     * document-processing workflow. Financial archive commands
     * always run after user-session validation below.
     */
    if (
      request.action ===
      "archive.list"
    ) {
      return createJsonResponse({
        success: true,
        data: listPoArchive(),
      });
    }

    if (
      request.action ===
      "archive.uploadPdf"
    ) {
      const replayedUpload =
        getCachedRequestResult(
          request,
        );

      if (replayedUpload) {
        return createJsonResponse(
          replayedUpload,
        );
      }

      return createRequestResponse(
        request,
        {
          success: true,
          data: uploadPoArchive(
            request.data,
            "LOCAL",
          ),
        },
      );
    }

    if (
      request.action ===
      "archive.prepareUpload"
    ) {
      return createJsonResponse({
        success: true,
        data:
          preparePoArchiveUpload(
            request.data,
          ),
      });
    }

    if (
      request.action ===
      "archive.registerUpload"
    ) {
      const replayedRegistration =
        getCachedRequestResult(
          request,
        );

      if (replayedRegistration) {
        return createJsonResponse(
          replayedRegistration,
        );
      }

      return createRequestResponse(
        request,
        {
          success: true,
          data:
            registerPoArchiveUpload(
              request.data,
              "LOCAL",
            ),
        },
      );
    }

    if (
      request.action ===
      "archive.getPdf"
    ) {
      return createJsonResponse({
        success: true,
        data: getPoArchivePdf(
          request.data,
        ),
      });
    }

    const session =
      validateUserSession(
        request.sessionToken,
      );

    const replayedResult =
      getCachedRequestResult(
        request,
      );

    if (replayedResult) {
      return createJsonResponse(
        replayedResult,
      );
    }

    let data;

    switch (request.action) {
      case "auth.me":
        data = {
          userCode:
            session.userCode,
          displayName:
            session.displayName,
          role: session.role,
        };
        break;

      case "auth.logout":
        data =
          logoutUserSession(
            request.sessionToken,
          );
        break;

      case "system.gatewayToken":
        data =
          issueDriveGatewayToken(
            session,
          );
        break;

      case "receivables.saveMonthly":
        data =
          saveReceivablesMonthly(
            request.data,
          );
        break;

      case "receivables.saveCreditNotes":
        requireOfficeOrHeadOfficeSession(
          session,
        );
        data =
          saveCreditNotesMonthly(
            request.data,
          );
        break;

      case "receivables.archiveList":
        data =
          listReceivablesArchives();
        break;

      case "receivables.archiveGet":
        data =
          getReceivablesArchive(
            request.data,
          );
        break;

      case "receivables.archiveUpdate":
        data =
          updateReceivablesArchive(
            request.data,
          );
        break;

      case "worldwide.list":
        data =
          listWorldwideRetail();
        break;

      case "worldwide.upload":
        requireOfficeSession(
          session,
        );
        data =
          uploadWorldwideRetail(
            request.data,
            session.userCode,
          );
        break;

      case "worldwide.acknowledge":
        requireHeadOfficeSession(
          session,
        );
        data =
          acknowledgeWorldwideRetail(
            request.data,
            session.userCode,
          );
        break;

      case "worldwide.delete":
        requireOfficeSession(
          session,
        );
        data =
          deleteWorldwideRetail(
            request.data,
          );
        break;

      case "worldwide.getPdf":
        data =
          getWorldwideRetailPdf(
            request.data,
          );
        break;

      case "po.list":
        data = listPoRecords();
        break;

      case "po.create":
        requireAdmin(session);
        data = createPoRecord(
          request.data,
          session.userCode,
        );
        break;

      case "po.update":
        requireAdmin(session);
        data = updatePoRecord(
          request.data.id,
          request.data.input,
          session.userCode,
        );
        break;

      case "po.updateStatus":
        requireAdmin(session);
        data = updatePoStatus(
          request.data.id,
          request.data.status,
          session.userCode,
          request.data.note,
        );
        break;

      case "po.delete":
        requireAdmin(session);
        data = deletePoRecord(
          request.data.id,
          session.userCode,
        );
        break;

      case "po.clearAll":
        requireAdmin(session);
        data = clearAllPoRecords(
          session.userCode,
        );
        break;

      case "po.history":
        data = listPoHistory(
          request.data.poId,
        );
        break;

      case "po.uploadPdf":
        data = uploadPoPdf(
          request.data,
          session.userCode,
        );
        break;

      case "po.getPdf":
        data = getPoPdf(
          request.data,
        );
        break;

      default:
        throw new Error(
          "ไม่รู้จักคำสั่ง: " +
            request.action,
        );
    }

    return createRequestResponse(
      request,
      {
        success: true,
        data: data,
      },
    );
  } catch (error) {
    /*
     * Never cache a failed mutation. The error may be temporary
     * (Drive/Sheets lock, quota or network), and the durable outbox
     * must be allowed to retry the same requestId later.
     */
    return createJsonResponse({
      success: false,
      message:
        error &&
        error.message
          ? error.message
          : String(error),
    });
  }
}

function parseRequest(event) {
  if (
    !event ||
    !event.postData ||
    !event.postData.contents
  ) {
    throw new Error(
      "ไม่พบข้อมูลคำขอ",
    );
  }

  return JSON.parse(
    event.postData.contents,
  );
}

function verifyApiToken(token) {
  const savedToken =
    getApiToken();

  const legacyTokenIsValid =
    Boolean(savedToken) &&
    token === savedToken;

  if (
    !legacyTokenIsValid &&
    !verifyDeviceToken(token)
  ) {
    throw new Error(
      "ไม่มีสิทธิ์เข้าใช้งาน API",
    );
  }
}

function createJsonResponse(
  payload,
) {
  return ContentService
    .createTextOutput(
      JSON.stringify(payload),
    )
    .setMimeType(
      ContentService.MimeType.JSON,
    );
}

const IDEMPOTENT_MUTATION_ACTIONS = [
  "system.activate",
  "auth.select",
  "auth.login",
  "auth.logout",
  "archive.uploadPdf",
  "archive.registerUpload",
  "receivables.saveMonthly",
  "receivables.saveCreditNotes",
  "receivables.archiveUpdate",
  "worldwide.upload",
  "worldwide.acknowledge",
  "worldwide.delete",
  "po.create",
  "po.update",
  "po.updateStatus",
  "po.delete",
  "po.clearAll",
  "po.uploadPdf",
];

const REQUEST_RESULT_CACHE_SECONDS =
  21600;

const REQUEST_LOG_SHEET_NAME =
  "REQUEST_LOG";

const REQUEST_LOG_HEADERS = [
  "REQUEST_KEY",
  "ACTION",
  "RESPONSE_JSON",
  "CREATED_AT",
];

const MAX_REQUEST_LOG_ROWS =
  5000;

const PERSISTENT_REPLAY_ACTIONS = [
  "archive.uploadPdf",
  "archive.registerUpload",
  "receivables.saveMonthly",
  "receivables.saveCreditNotes",
  "receivables.archiveUpdate",
  "worldwide.upload",
  "worldwide.acknowledge",
  "worldwide.delete",
  "po.create",
  "po.update",
  "po.updateStatus",
  "po.delete",
  "po.clearAll",
  "po.uploadPdf",
];

function createRequestResponse(
  request,
  payload,
) {
  cacheRequestResult(
    request,
    payload,
  );

  return createJsonResponse(
    payload,
  );
}

function getCachedRequestResult(
  request,
) {
  const cacheKey =
    getRequestCacheKey(
      request,
    );

  if (!cacheKey) {
    return null;
  }

  let cachedValue = "";

  try {
    cachedValue =
      CacheService
        .getScriptCache()
        .get(cacheKey) || "";
  } catch (_error) {
    return getPersistentRequestResult(
      request,
      cacheKey,
    );
  }

  if (!cachedValue) {
    return getPersistentRequestResult(
      request,
      cacheKey,
    );
  }

  try {
    return JSON.parse(
      cachedValue,
    );
  } catch (_error) {
    return getPersistentRequestResult(
      request,
      cacheKey,
    );
  }
}

function cacheRequestResult(
  request,
  payload,
) {
  const cacheKey =
    getRequestCacheKey(
      request,
    );

  if (!cacheKey) {
    return;
  }

  try {
    CacheService
      .getScriptCache()
      .put(
        cacheKey,
        JSON.stringify(
          payload,
        ),
        REQUEST_RESULT_CACHE_SECONDS,
      );
  } catch (_error) {
    // The business operation has already completed. A cache
    // failure must not turn a successful save into an error.
  }

  cachePersistentRequestResult(
    request,
    cacheKey,
    payload,
  );
}

function getRequestCacheKey(
  request,
) {
  if (
    !request ||
    !request.requestId ||
    IDEMPOTENT_MUTATION_ACTIONS
      .indexOf(
        String(
          request.action || "",
        ),
      ) === -1
  ) {
    return "";
  }

  const requestId =
    String(
      request.requestId,
    )
      .trim()
      .replace(
        /[^A-Za-z0-9_-]/g,
        "",
      )
      .slice(0, 80);

  const action =
    String(
      request.action || "",
    )
      .replace(
        /[^A-Za-z0-9_.-]/g,
        "",
      )
      .slice(0, 60);

  return requestId && action
    ? "VP_REQ_" +
        action +
        "_" +
        requestId
    : "";
}

function getPersistentRequestResult(
  request,
  cacheKey,
) {
  if (
    !isPersistentReplayAction(
      request,
    )
  ) {
    return null;
  }

  try {
    const sheet =
      getRequestLogSheet();
    const match =
      sheet
        .getRange(
          2,
          1,
          Math.max(
            sheet.getLastRow() - 1,
            1,
          ),
          1,
        )
        .createTextFinder(
          cacheKey,
        )
        .matchEntireCell(true)
        .findNext();

    if (!match) {
      return null;
    }

    const responseJson =
      String(
        sheet.getRange(
          match.getRow(),
          3,
        ).getValue() || "",
      );

    return responseJson
      ? JSON.parse(
          responseJson,
        )
      : null;
  } catch (_error) {
    return null;
  }
}

function cachePersistentRequestResult(
  request,
  cacheKey,
  payload,
) {
  if (
    !isPersistentReplayAction(
      request,
    )
  ) {
    return;
  }

  const responseJson =
    JSON.stringify(
      payload,
    );

  if (
    responseJson.length >
    45000
  ) {
    return;
  }

  const lock =
    LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const sheet =
      getRequestLogSheet();
    const lastRow =
      sheet.getLastRow();
    const match =
      lastRow >= 2
        ? sheet
            .getRange(
              2,
              1,
              lastRow - 1,
              1,
            )
            .createTextFinder(
              cacheKey,
            )
            .matchEntireCell(
              true,
            )
            .findNext()
        : null;

    if (match) {
      return;
    }

    sheet.appendRow([
      cacheKey,
      String(
        request.action || "",
      ),
      responseJson,
      new Date(),
    ]);

    const dataRows =
      sheet.getLastRow() - 1;

    if (
      dataRows >
      MAX_REQUEST_LOG_ROWS
    ) {
      sheet.deleteRows(
        2,
        dataRows -
          MAX_REQUEST_LOG_ROWS,
      );
    }
  } catch (_error) {
    // CacheService and business-level duplicate checks remain as
    // fallbacks if the request log cannot be written.
  } finally {
    try {
      lock.releaseLock();
    } catch (_error) {
      // Ignore releasing a lock that was not acquired.
    }
  }
}

function getRequestLogSheet() {
  const spreadsheet =
    getSystemSpreadsheet();
  let sheet =
    spreadsheet.getSheetByName(
      REQUEST_LOG_SHEET_NAME,
    );

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(
        REQUEST_LOG_SHEET_NAME,
      );
    sheet.getRange(
      1,
      1,
      1,
      REQUEST_LOG_HEADERS.length,
    ).setValues([
      REQUEST_LOG_HEADERS,
    ]);
    sheet.setFrozenRows(1);

    try {
      sheet.hideSheet();
    } catch (_error) {
      // Keeping the sheet visible is harmless if hiding is denied.
    }
  }

  return sheet;
}

function isPersistentReplayAction(
  request,
) {
  return (
    request &&
    PERSISTENT_REPLAY_ACTIONS
      .indexOf(
        String(
          request.action || "",
        ),
      ) !== -1
  );
}

function requireOfficeSession(
  session,
) {
  if (
    !session ||
    String(
      session.userCode || "",
    )
      .trim()
      .toUpperCase() !==
      "OFFICE"
  ) {
    throw new Error(
      "เฉพาะฝั่ง Retail เท่านั้นที่บันทึกเอกสารได้",
    );
  }
}

function requireOfficeOrHeadOfficeSession(
  session,
) {
  const userCode =
    String(
      session &&
        session.userCode
        ? session.userCode
        : "",
    )
      .trim()
      .toUpperCase();

  if (
    userCode !== "OFFICE" &&
    userCode !== "HEADOFFICE"
  ) {
    throw new Error(
      "เฉพาะฝั่ง Retail หรือสำนักงานใหญ่เท่านั้นที่บันทึกลดหนี้ได้",
    );
  }
}

function requireHeadOfficeSession(
  session,
) {
  if (
    !session ||
    String(
      session.userCode || "",
    )
      .trim()
      .toUpperCase() !==
      "HEADOFFICE"
  ) {
    throw new Error(
      "เฉพาะสำนักงานใหญ่เท่านั้นที่ตอบรับเอกสารได้",
    );
  }
}
