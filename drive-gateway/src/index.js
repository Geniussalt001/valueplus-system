let cachedGoogleToken = null;

export default {
  async fetch(request, env) {
    try {
      if (request.method === "OPTIONS") {
        return withCors(new Response(null, {
          status: 204,
        }));
      }

      const url = new URL(request.url);

    if (
      request.method === "GET" &&
      url.pathname === "/health"
    ) {
      return json({
        ok: true,
        service: "valueplus-drive-gateway",
      });
    }

    const session = await verifyValuePlusToken(
      request.headers.get("Authorization"),
      env.DRIVE_GATEWAY_SIGNING_SECRET,
    );

    if (!session) {
      return json({
        ok: false,
        message: "Unauthorized",
      }, 401);
    }

    const fileMatch =
      url.pathname.match(
        /^\/v1\/files\/([A-Za-z0-9_-]+)$/,
      );

    if (
      request.method === "GET" &&
      fileMatch
    ) {
      return downloadDriveFile(
        fileMatch[1],
        env,
      );
    }

    if (
      request.method === "POST" &&
      url.pathname ===
        "/v1/uploads/resumable"
    ) {
      return createResumableUpload(
        request,
        env,
      );
    }

      return json({
        ok: false,
        message: "Not found",
      }, 404);
    } catch (error) {
      return json({
        ok: false,
        message:
          "Drive Gateway temporary failure",
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      }, 502);
    }
  },
};

async function downloadDriveFile(
  fileId,
  env,
) {
  const accessToken =
    await getGoogleAccessToken(env);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    {
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    return json({
      ok: false,
      message:
        "Google Drive download failed",
      status: response.status,
    }, response.status);
  }

  return withCors(new Response(
    response.body,
    {
      status: 200,
      headers: {
        "Content-Type":
          response.headers.get(
            "Content-Type",
          ) || "application/pdf",
        "Cache-Control":
          "private, no-store",
      },
    },
  ));
}

async function createResumableUpload(
  request,
  env,
) {
  const input = await request.json();
  const fileName = String(
    input.fileName || "",
  ).trim();
  const mimeType = String(
    input.mimeType ||
      "application/pdf",
  ).trim();
  const parentId = String(
    input.parentId ||
      env.DRIVE_ROOT_FOLDER_ID ||
      "",
  ).trim();
  const size = Number(
    input.size || 0,
  );

  if (
    !fileName ||
    !parentId ||
    mimeType !== "application/pdf" ||
    !Number.isFinite(size) ||
    size <= 0 ||
    size > 8 * 1024 * 1024
  ) {
    return json({
      ok: false,
      message:
        "Invalid upload metadata",
    }, 400);
  }

  const accessToken =
    await getGoogleAccessToken(env);
  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id%2Cname",
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
        "Content-Type":
          "application/json; charset=UTF-8",
        "X-Upload-Content-Type":
          mimeType,
        "X-Upload-Content-Length":
          String(size),
      },
      body: JSON.stringify({
        name: fileName,
        mimeType,
        parents: [parentId],
      }),
    },
  );
  const uploadUrl =
    response.headers.get("Location");

  if (!response.ok || !uploadUrl) {
    return json({
      ok: false,
      message:
        "Cannot create resumable upload",
      status: response.status,
    }, 502);
  }

  return json({
    ok: true,
    uploadUrl,
  });
}

async function getGoogleAccessToken(
  env,
) {
  if (
    cachedGoogleToken &&
    cachedGoogleToken.expiresAt -
      Date.now() >
      60_000
  ) {
    return cachedGoogleToken.token;
  }

  const body =
    new URLSearchParams({
      client_id:
        env.GOOGLE_CLIENT_ID,
      client_secret:
        env.GOOGLE_CLIENT_SECRET,
      refresh_token:
        env.GOOGLE_REFRESH_TOKEN,
      grant_type:
        "refresh_token",
    });
  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body,
    },
  );
  const result = await response.json();

  if (!response.ok || !result.access_token) {
    throw new Error(
      "Google OAuth refresh failed",
    );
  }

  cachedGoogleToken = {
    token: result.access_token,
    expiresAt:
      Date.now() +
      Number(
        result.expires_in || 3600,
      ) * 1000,
  };

  return cachedGoogleToken.token;
}

async function verifyValuePlusToken(
  authorization,
  secret,
) {
  if (!secret) {
    return null;
  }

  const token = String(
    authorization || "",
  ).replace(/^Bearer\s+/i, "");
  const [payloadPart, signaturePart] =
    token.split(".");

  if (!payloadPart || !signaturePart) {
    return null;
  }

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["verify"],
    );
    const verified =
      await crypto.subtle.verify(
        "HMAC",
        key,
        decodeBase64Url(signaturePart),
        new TextEncoder().encode(
          payloadPart,
        ),
      );

    if (!verified) {
      return null;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(
        decodeBase64Url(payloadPart),
      ),
    );

    if (
      !payload.sub ||
      Number(payload.exp) <=
        Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function decodeBase64Url(value) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded =
    normalized.padEnd(
      Math.ceil(
        normalized.length / 4,
      ) * 4,
      "=",
    );
  const binary = atob(padded);
  return Uint8Array.from(
    binary,
    (character) =>
      character.charCodeAt(0),
  );
}

function json(value, status = 200) {
  return withCors(new Response(
    JSON.stringify(value),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
      },
    },
  ));
}

function withCors(response) {
  const headers = new Headers(
    response.headers,
  );
  headers.set(
    "Access-Control-Allow-Origin",
    "*",
  );
  headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Upload-Content-Length, X-Upload-Content-Type",
  );
  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, OPTIONS",
  );
  return new Response(
    response.body,
    {
      status: response.status,
      statusText:
        response.statusText,
      headers,
    },
  );
}
