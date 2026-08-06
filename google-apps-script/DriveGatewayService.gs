const DRIVE_GATEWAY_TOKEN_TTL_SECONDS =
  15 * 60;

function issueDriveGatewayToken(
  session,
) {
  const secret =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        "DRIVE_GATEWAY_SIGNING_SECRET",
      );

  if (!secret) {
    throw new Error(
      "ยังไม่ได้เปิดใช้งาน Drive Gateway",
    );
  }

  const now = Math.floor(
    Date.now() / 1000,
  );
  const expiresAt =
    now +
    DRIVE_GATEWAY_TOKEN_TTL_SECONDS;
  const payload = {
    sub: String(
      session.userCode || "",
    ),
    role: String(
      session.role || "",
    ),
    iat: now,
    exp: expiresAt,
  };
  const encodedPayload =
    base64UrlEncodeGateway_(
      JSON.stringify(payload),
    );
  const signature =
    Utilities
      .computeHmacSha256Signature(
        encodedPayload,
        secret,
      );
  const encodedSignature =
    Utilities
      .base64EncodeWebSafe(
        signature,
      )
      .replace(/=+$/g, "");

  return {
    token:
      encodedPayload +
      "." +
      encodedSignature,
    expiresAt:
      new Date(
        expiresAt * 1000,
      ).toISOString(),
  };
}

function base64UrlEncodeGateway_(
  value,
) {
  return Utilities
    .base64EncodeWebSafe(
      Utilities.newBlob(
        String(value),
      ).getBytes(),
    )
    .replace(/=+$/g, "");
}
