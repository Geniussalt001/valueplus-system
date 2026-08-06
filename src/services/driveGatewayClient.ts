import {
  fetch,
} from "@tauri-apps/plugin-http";

import {
  invoke,
} from "@tauri-apps/api/core";

import {
  callAppsScript,
} from "./appsScriptClient";

interface GatewayTokenResponse {
  token: string;
  expiresAt: string;
}

export interface GatewayPdf {
  fileId: string;
  fileName: string;
  mimeType: "application/pdf";
  base64Data: string;
}

interface LocalPdfMetadata {
  fileName: string;
  size: number;
}

interface ResumableUploadResult {
  fileId: string;
  fileName: string;
}

export class DriveGatewayUploadError extends Error {
  readonly stage:
    | "prepare"
    | "transfer";

  constructor(
    stage: "prepare" | "transfer",
    message: string,
  ) {
    super(message);
    this.name =
      "DriveGatewayUploadError";
    this.stage = stage;
  }
}

const gatewayUrl = String(
  import.meta.env
    .VITE_DRIVE_GATEWAY_URL ||
    "",
)
  .trim()
  .replace(/\/+$/, "");

let cachedGatewayToken:
  | GatewayTokenResponse
  | null = null;

export function hasDriveGateway() {
  return Boolean(gatewayUrl);
}

export async function getGatewayPdf(
  fileId: string,
  fileName: string,
): Promise<GatewayPdf> {
  if (!gatewayUrl) {
    throw new Error(
      "DRIVE_GATEWAY_DISABLED",
    );
  }

  const cacheKey =
    createPdfCacheKey(fileId);

  try {
    const cached =
      await invoke<
        GatewayPdf | null
      >(
        "read_apps_script_cache",
        {
          cacheKey,
        },
      );

    if (cached !== null) {
      return cached;
    }
  } catch {
    // Continue with the remote request when local cache is missing.
  }

  const token =
    await getGatewayToken();
  const response = await fetch(
    `${gatewayUrl}/v1/files/${encodeURIComponent(fileId)}`,
    {
      method: "GET",
      connectTimeout: 10_000,
      headers: {
        Authorization:
          `Bearer ${token}`,
        Accept:
          "application/pdf",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Drive Gateway ไม่พร้อมใช้งาน (${response.status})`,
    );
  }

  const bytes =
    new Uint8Array(
      await response.arrayBuffer(),
    );

  const pdf: GatewayPdf = {
    fileId,
    fileName,
    mimeType:
      "application/pdf",
    base64Data:
      bytesToBase64(bytes),
  };

  try {
    await invoke(
      "write_apps_script_cache",
      {
        cacheKey,
        data: pdf,
      },
    );
  } catch {
    // The preview is still usable even if the local cache is full.
  }

  return pdf;
}

export async function uploadPdfWithGateway(
  path: string,
  parentId: string,
) {
  if (!gatewayUrl) {
    throw new DriveGatewayUploadError(
      "prepare",
      "DRIVE_GATEWAY_DISABLED",
    );
  }

  const metadata =
    await invoke<
      LocalPdfMetadata
    >(
      "get_local_pdf_metadata",
      {
        path,
      },
    );
  const token =
    await getGatewayToken();
  const response = await fetch(
    `${gatewayUrl}/v1/uploads/resumable`,
    {
      method: "POST",
      connectTimeout: 10_000,
      headers: {
        Authorization:
          `Bearer ${token}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        fileName:
          metadata.fileName,
        mimeType:
          "application/pdf",
        parentId,
        size: metadata.size,
      }),
    },
  );
  const result =
    await response.json() as {
      ok?: boolean;
      uploadUrl?: string;
      message?: string;
    };

  if (
    !response.ok ||
    !result.uploadUrl
  ) {
    throw new DriveGatewayUploadError(
      "prepare",
      result.message ||
        `เริ่มอัปโหลดผ่าน Drive Gateway ไม่สำเร็จ (${response.status})`,
    );
  }

  try {
    return await invoke<
      ResumableUploadResult
    >(
      "upload_pdf_resumable",
      {
        path,
        uploadUrl:
          result.uploadUrl,
      },
    );
  } catch (reason) {
    throw new DriveGatewayUploadError(
      "transfer",
      reason instanceof Error
        ? reason.message
        : String(reason),
    );
  }
}

function createPdfCacheKey(
  fileId: string,
) {
  const safeFileId =
    fileId.replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    );

  return `drive_pdf_${safeFileId}`
    .slice(0, 128);
}

async function getGatewayToken() {
  if (
    cachedGatewayToken &&
    Date.parse(
      cachedGatewayToken
        .expiresAt,
    ) -
      Date.now() >
      60_000
  ) {
    return cachedGatewayToken
      .token;
  }

  const result =
    await callAppsScript<
      GatewayTokenResponse
    >(
      "system.gatewayToken",
      {},
      {
        requestProfile:
          "interactive",
        queueOnFailure: false,
      },
    );

  cachedGatewayToken = result;
  return result.token;
}

function bytesToBase64(
  bytes: Uint8Array,
) {
  const chunkSize = 32_768;
  let binary = "";

  for (
    let offset = 0;
    offset < bytes.length;
    offset += chunkSize
  ) {
    binary +=
      String.fromCharCode(
        ...bytes.subarray(
          offset,
          offset + chunkSize,
        ),
      );
  }

  return window.btoa(binary);
}
