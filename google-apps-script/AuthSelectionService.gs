function selectUserSession(
  input,
) {
  const userCode =
    String(
      input &&
        input.userCode
        ? input.userCode
        : "",
    )
      .trim()
      .toUpperCase();

  if (
    [
      "OFFICE",
      "HEADOFFICE",
    ].indexOf(userCode) === -1
  ) {
    throw new Error(
      "ไม่พบหน่วยงานที่เลือก",
    );
  }

  const user =
    getUserAuthRecord(
      userCode,
    );

  if (!user || !user.active) {
    throw new Error(
      "ไม่พบผู้ใช้งานหรือบัญชีถูกระงับ",
    );
  }

  const session =
    createUserSession(user);

  return {
    sessionToken:
      session.sessionToken,
    expiresAt:
      session.expiresAt,
    user: {
      userCode:
        user.userCode,
      displayName:
        user.displayName,
      role:
        user.role,
    },
  };
}
