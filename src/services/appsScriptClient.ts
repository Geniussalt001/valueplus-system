import {
  fetch,
} from "@tauri-apps/plugin-http";

import {
  invoke,
} from "@tauri-apps/api/core";

import {
  getSessionToken,
} from "../auth/authSession";

interface AppsScriptResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface RequestOptions {
  requireSession?: boolean;
}

const apiUrl =
  import.meta.env
    .VITE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycby8fpraC4QvMcd5Qq6k24VFGnE_TsNPTeo_Ny0FuyEWjlQuxrbklNhHvFsY_p2yJdhF/exec";

const developmentApiToken =
  import.meta.env
    .VITE_APPS_SCRIPT_TOKEN as
    | string
    | undefined;

let cachedDeviceToken:
  | string
  | null
  | undefined;

function validateConfiguration() {
  if (!apiUrl) {
    throw new Error(
      "ยังไม่ได้ตั้งค่าที่อยู่ Apps Script",
    );
  }
}

async function getApiToken() {
  if (
    cachedDeviceToken !==
    undefined
  ) {
    return (
      cachedDeviceToken ||
      developmentApiToken ||
      ""
    );
  }

  try {
    cachedDeviceToken =
      await invoke<
        string | null
      >(
        "get_connection_token",
      );
  } catch {
    cachedDeviceToken = null;
  }

  return (
    cachedDeviceToken ||
    developmentApiToken ||
    ""
  );
}

export async function hasAppsScriptConnection() {
  return Boolean(
    await getApiToken(),
  );
}

export async function clearAppsScriptConnection() {
  await invoke(
    "clear_connection_token",
  );
  cachedDeviceToken = null;
}

interface ActivationResult {
  deviceToken: string;
  activatedAt: string;
}

export async function activateAppsScript(
  activationCode: string,
) {
  validateConfiguration();

  const response = await fetch(
    apiUrl,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action:
          "system.activate",
        data: {
          activationCode:
            activationCode.trim(),
          deviceName:
            "ValuePlus Windows",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `เชื่อมต่อระบบไม่สำเร็จ (${response.status})`,
    );
  }

  const result =
    (await response.json()) as
      AppsScriptResponse<
        ActivationResult
      >;

  if (
    !result.success ||
    !result.data?.deviceToken
  ) {
    throw new Error(
      result.message ||
        "รหัสเปิดใช้งานไม่ถูกต้อง",
    );
  }

  await invoke(
    "save_connection_token",
    {
      token:
        result.data.deviceToken,
    },
  );

  cachedDeviceToken =
    result.data.deviceToken;

  return result.data;
}

export async function callAppsScript<T>(
  action: string,
  data: unknown = {},
  options: RequestOptions = {},
): Promise<T> {
  validateConfiguration();
  const apiToken =
    await getApiToken();

  if (!apiToken) {
    throw new Error(
      "ACTIVATION_REQUIRED",
    );
  }

  const requireSession =
    options.requireSession !==
    false;

  const sessionToken =
    requireSession
      ? getSessionToken()
      : "";

  if (
    requireSession &&
    !sessionToken
  ) {
    throw new Error(
      "SESSION_REQUIRED",
    );
  }

  const response = await fetch(
    apiUrl,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "text/plain;charset=utf-8",
      },

      body: JSON.stringify({
        action,
        token: apiToken,
        sessionToken,
        data,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `เชื่อมต่อ Apps Script ไม่สำเร็จ (${response.status})`,
    );
  }

  const result =
    (await response.json()) as
      AppsScriptResponse<T>;

  if (!result.success) {
    if (
      result.message ===
      "ไม่มีสิทธิ์เข้าใช้งาน API"
    ) {
      await clearAppsScriptConnection();
      throw new Error(
        "ACTIVATION_REQUIRED",
      );
    }

    throw new Error(
      result.message ||
        "Apps Script ไม่สามารถดำเนินการได้",
    );
  }

  if (
    result.data === undefined
  ) {
    throw new Error(
      "Apps Script ไม่ได้ส่งข้อมูลกลับมา",
    );
  }

  return result.data;
}
