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
  try {
    const request =
      parseRequest(event);

    verifyApiToken(
      request.token,
    );

    if (
      request.action ===
      "auth.login"
    ) {
      const loginResult =
        authenticateUser(
          request.data,
        );

      return createJsonResponse({
        success: true,
        data: loginResult,
      });
    }

    /*
     * Desktop archive commands use the same protected API token
     * as the current ValuePlus desktop app. They run before the
     * legacy user-session check because installed builds currently
     * do not carry an Apps Script session token.
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
      return createJsonResponse({
        success: true,
        data: uploadPoArchive(
          request.data,
          "LOCAL",
        ),
      });
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

    return createJsonResponse({
      success: true,
      data: data,
    });
  } catch (error) {
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

  if (
    !savedToken ||
    token !== savedToken
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
