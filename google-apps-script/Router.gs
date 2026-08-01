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

    if (
      request.action ===
      "system.activate"
    ) {
      return createJsonResponse({
        success: true,
        data:
          activateValuePlusDevice(
            request.data,
          ),
      });
    }

    verifyApiToken(
      request.token,
    );

    if (
      request.action ===
      "auth.select"
    ) {
      const selectedSession =
        selectUserSession(
          request.data,
        );

      return createJsonResponse({
        success: true,
        data: selectedSession,
      });
    }

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
