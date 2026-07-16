import { fetch } from "@tauri-apps/plugin-http";

interface AppsScriptResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const apiUrl = import.meta.env
  .VITE_APPS_SCRIPT_URL as string | undefined;

const apiToken = import.meta.env
  .VITE_APPS_SCRIPT_TOKEN as string | undefined;

const userCode =
  (import.meta.env.VITE_USER_CODE as string | undefined) ??
  "LOCAL";

function validateConfiguration() {
  if (!apiUrl) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า VITE_APPS_SCRIPT_URL ใน .env.local",
    );
  }

  if (!apiToken) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า VITE_APPS_SCRIPT_TOKEN ใน .env.local",
    );
  }
}

export async function callAppsScript<T>(
  action: string,
  data: unknown = {},
): Promise<T> {
  validateConfiguration();

  const response = await fetch(apiUrl!, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action,
      token: apiToken,
      userCode,
      data,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `เชื่อมต่อ Apps Script ไม่สำเร็จ (${response.status})`,
    );
  }

  const result =
    (await response.json()) as AppsScriptResponse<T>;

  if (!result.success) {
    throw new Error(
      result.message || "Apps Script ไม่สามารถทำรายการได้",
    );
  }

  if (result.data === undefined) {
    throw new Error("Apps Script ไม่ได้ส่งข้อมูลกลับมา");
  }

  return result.data;
}