import {
  fetch,
} from "@tauri-apps/plugin-http";

import {
  invoke,
} from "@tauri-apps/api/core";

import {
  AUTH_SESSION_CHANGED_EVENT,
  getAuthSession,
  getSessionToken,
} from "../auth/authSession";

interface AppsScriptResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface RequestOptions {
  requireSession?: boolean;
  retryTransient?: boolean;
  queueOnFailure?: boolean;
  requestId?: string;
  transport?: ApiTransport;
}

type ApiTransport =
  "apps-script";

export class AppsScriptHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(
      `เชื่อมต่อ Apps Script ไม่สำเร็จ (${status})`,
    );
    this.name =
      "AppsScriptHttpError";
    this.status = status;
  }
}

export class AppsScriptQueuedError extends Error {
  readonly requestId: string;
  readonly action: string;

  constructor(
    requestId: string,
    action: string,
  ) {
    super(
      "ระบบรับงานไว้แล้วและจะซิงก์ให้อัตโนมัติ",
    );
    this.name =
      "AppsScriptQueuedError";
    this.requestId = requestId;
    this.action = action;
  }
}

interface AppsScriptOutboxEntry {
  version: number;
  requestId: string;
  action: string;
  data: unknown;
  requireSession: boolean;
  sessionUserCode: string;
  transport?: ApiTransport;
  createdAtMs: number;
}

export interface AppsScriptOutboxSummary {
  requestId: string;
  action: string;
  requireSession: boolean;
  sessionUserCode: string;
  transport?: ApiTransport;
  createdAtMs: number;
  sizeBytes: number;
}

export interface AppsScriptSyncSnapshot {
  pendingCount: number;
  syncing: boolean;
  lastSyncedAt: number | null;
}

export const APPS_SCRIPT_SYNC_COMPLETED_EVENT =
  "valueplus-apps-script-sync-completed";

const appsScriptApiUrl =
  import.meta.env
    .VITE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbxhx-ypQHUXIqSI0U5zCaoc91M7Vcy2t6lwVwkTknUOOEBXsDeB8LlK4R-aPzrsq-ZH/exec";

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
  if (!appsScriptApiUrl) {
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

  const requestBody =
    JSON.stringify({
      action:
        "system.activate",
      requestId:
        createRequestId(),
      data: {
        activationCode:
          activationCode.trim(),
        deviceName:
          "ValuePlus Windows",
      },
    });

  const transport =
    resolveApiTransport();

  const result =
    await executeWithTransientRetry(
      () =>
        sendApiRequest<
          ActivationResult
        >(
          requestBody,
          transport,
        ),
      5,
    );

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

/*
 * All retries reuse the same serialized body and requestId. The
 * deployed Apps Script can therefore replay a completed mutation
 * instead of performing it twice when only the HTTP response was
 * lost.
 */
async function executeWithTransientRetry<T>(
  operation: () => Promise<T>,
  maximumAttempts: number,
): Promise<T> {
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= maximumAttempts;
    attempt += 1
  ) {
    try {
      return await operation();
    } catch (reason) {
      lastError = reason;

      if (
        attempt >= maximumAttempts ||
        !isTransientAppsScriptError(
          reason,
        )
      ) {
        throw reason;
      }

      const baseDelay =
        transientRetryDelays[
          Math.min(
            attempt - 1,
            transientRetryDelays.length - 1,
          )
        ];

      await wait(
        baseDelay +
          Math.floor(
            Math.random() * 250,
          ),
      );
    }
  }

  throw lastError;
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

  const requestId =
    options.requestId ||
    createRequestId();

  const transport =
    options.transport ||
    resolveApiTransport();

  const requestBody =
    JSON.stringify({
      action,
      token: apiToken,
      sessionToken,
      requestId,
      data,
    });

  const maximumAttempts =
    options.retryTransient ===
    false
      ? 1
      : 5;

  const responseCacheKey =
    cacheableReadActions.has(
      action,
    )
      ? await createResponseCacheKey(
          action,
          data,
        )
      : "";

  try {
    const result =
      await executeWithTransientRetry(
        async () => {
          const response =
            await sendApiRequest<T>(
              requestBody,
              transport,
            );

          return unwrapAppsScriptResult(
            response,
          );
        },
        maximumAttempts,
      );

    if (responseCacheKey) {
      try {
        await invoke(
          "write_apps_script_cache",
          {
            cacheKey:
              responseCacheKey,
            data: result,
          },
        );

      } catch {
        // A cache failure must never turn a successful remote
        // request into a visible application error.
      }
    }

    return result;
  } catch (reason) {
    if (
      responseCacheKey &&
      isTransientAppsScriptError(
        reason,
      )
    ) {
      try {
        const cached =
          await invoke<T | null>(
            "read_apps_script_cache",
            {
              cacheKey:
                responseCacheKey,
            },
          );

        if (cached !== null) {
          return cached;
        }
      } catch {
        // Keep the original network error when no valid local
        // response is available.
      }
    }

    if (
      options.queueOnFailure !==
        false &&
      queueableMutationActions.has(
        action,
      ) &&
      isTransientAppsScriptError(
        reason,
      )
    ) {
      try {
        await enqueueAppsScriptRequest({
          requestId,
          action,
          data,
          transport,
          requireSession,
          sessionUserCode:
            getCurrentSessionUserCode(),
        });

        throw new AppsScriptQueuedError(
          requestId,
          action,
        );
      } catch (queueReason) {
        if (
          queueReason instanceof
          AppsScriptQueuedError
        ) {
          throw queueReason;
        }
      }
    }

    throw reason;
  }
}

const queueableMutationActions =
  new Set([
    "archive.uploadPdf",
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
  ]);

const cacheableReadActions =
  new Set([
    "archive.list",
    "archive.getPdf",
    "receivables.archiveList",
    "receivables.archiveGet",
    "worldwide.list",
    "worldwide.getPdf",
    "po.list",
    "po.history",
    "po.getPdf",
  ]);

const transientRetryDelays = [
  700,
  1_400,
  2_800,
  4_500,
];

const transientHttpStatuses =
  new Set([
    404,
    408,
    425,
    429,
    500,
    502,
    503,
    504,
  ]);

async function sendApiRequest<T>(
  requestBody: string,
  _transport: ApiTransport,
): Promise<AppsScriptResponse<T>> {
  const response = await fetch(
    appsScriptApiUrl,
    {
      method: "POST",
      maxRedirections: 10,
      connectTimeout: 15_000,
      headers: {
        "Content-Type":
          "text/plain;charset=utf-8",
      },
      body: requestBody,
    },
  );

  if (!response.ok) {
    throw new AppsScriptHttpError(
      response.status,
    );
  }

  return (await response.json()) as
    AppsScriptResponse<T>;
}

function resolveApiTransport(): ApiTransport {
  return "apps-script";
}

async function unwrapAppsScriptResult<T>(
  result: AppsScriptResponse<T>,
): Promise<T> {
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

function isTransientAppsScriptError(
  reason: unknown,
) {
  if (reason instanceof SyntaxError) {
    return true;
  }

  if (
    reason instanceof
    AppsScriptHttpError
  ) {
    return transientHttpStatuses.has(
      reason.status,
    );
  }

  const message =
    reason instanceof Error
      ? reason.message
      : String(reason);

  return [
    "ไม่ได้ส่งข้อมูลกลับมา",
    "network",
    "fetch",
    "timeout",
    "timed out",
    "unexpected end of json",
  ].some((keyword) =>
    message
      .toLowerCase()
      .includes(
        keyword.toLowerCase(),
      ),
  );
}

let outboxSnapshot:
  AppsScriptSyncSnapshot = {
    pendingCount: 0,
    syncing: false,
    lastSyncedAt: null,
  };

const outboxListeners =
  new Set<
    (
      snapshot:
        AppsScriptSyncSnapshot,
    ) => void
  >();

let activeOutboxSync:
  | Promise<AppsScriptSyncSnapshot>
  | null = null;

async function enqueueAppsScriptRequest(
  request: Omit<
    AppsScriptOutboxEntry,
    "version" | "createdAtMs"
  >,
) {
  await invoke<
    AppsScriptOutboxSummary
  >(
    "enqueue_apps_script_outbox",
    {
      request,
    },
  );

  try {
    await refreshAppsScriptOutbox();
  } catch {
    updateOutboxSnapshot({
      pendingCount:
        outboxSnapshot.pendingCount +
        1,
    });
  }
}

export function isAppsScriptQueuedError(
  reason: unknown,
): reason is AppsScriptQueuedError {
  return (
    reason instanceof
    AppsScriptQueuedError
  );
}

export function getAppsScriptSyncSnapshot() {
  return {
    ...outboxSnapshot,
  };
}

export function subscribeAppsScriptSync(
  listener: (
    snapshot:
      AppsScriptSyncSnapshot,
  ) => void,
) {
  outboxListeners.add(listener);
  listener(
    getAppsScriptSyncSnapshot(),
  );

  return () => {
    outboxListeners.delete(
      listener,
    );
  };
}

export async function refreshAppsScriptOutbox() {
  const entries =
    await invoke<
      AppsScriptOutboxSummary[]
    >(
      "list_apps_script_outbox",
    );

  updateOutboxSnapshot({
    pendingCount:
      entries.length,
  });

  return entries;
}

export async function syncAppsScriptOutbox():
  Promise<AppsScriptSyncSnapshot> {
  if (activeOutboxSync) {
    return activeOutboxSync;
  }

  activeOutboxSync =
    runAppsScriptOutboxSync()
      .finally(() => {
        activeOutboxSync = null;
      });

  return activeOutboxSync;
}

async function runAppsScriptOutboxSync() {
  updateOutboxSnapshot({
    syncing: true,
  });

  try {
    const summaries =
      await refreshAppsScriptOutbox();

    if (
      !summaries.length ||
      !(await hasAppsScriptConnection())
    ) {
      return getAppsScriptSyncSnapshot();
    }

    const currentUserCode =
      getCurrentSessionUserCode();

    for (const summary of summaries) {
      if (
        summary.requireSession &&
        (!getSessionToken() ||
          (summary.sessionUserCode &&
            summary.sessionUserCode !==
              currentUserCode))
      ) {
        continue;
      }

      const entry =
        await invoke<
          AppsScriptOutboxEntry
        >(
          "read_apps_script_outbox",
          {
            requestId:
              summary.requestId,
          },
        );

      try {
        await callAppsScript(
          entry.action,
          entry.data,
          {
            requireSession:
              entry.requireSession,
            requestId:
              entry.requestId,
            transport:
              entry.transport ||
              "apps-script",
            queueOnFailure: false,
          },
        );

        await invoke(
          "remove_apps_script_outbox",
          {
            requestId:
              entry.requestId,
          },
        );

        window.dispatchEvent(
          new CustomEvent(
            APPS_SCRIPT_SYNC_COMPLETED_EVENT,
            {
              detail: {
                requestId:
                  entry.requestId,
                action:
                  entry.action,
              },
            },
          ),
        );

        updateOutboxSnapshot({
          lastSyncedAt:
            Date.now(),
        });
      } catch (reason) {
        if (
          isTransientAppsScriptError(
            reason,
          ) ||
          getErrorMessage(reason) ===
            "ACTIVATION_REQUIRED" ||
          getErrorMessage(reason) ===
            "SESSION_REQUIRED"
        ) {
          break;
        }
      }
    }

    await refreshAppsScriptOutbox();
    return getAppsScriptSyncSnapshot();
  } finally {
    updateOutboxSnapshot({
      syncing: false,
    });
  }
}

export function startAppsScriptOutboxSync() {
  let stopped = false;

  const triggerSync = () => {
    if (!stopped) {
      void syncAppsScriptOutbox()
        .catch(() => {
          // The durable files remain in place and the next timer,
          // focus or online event will try again.
        });
    }
  };

  const interval =
    window.setInterval(
      triggerSync,
      20_000,
    );

  window.addEventListener(
    "online",
    triggerSync,
  );
  window.addEventListener(
    "focus",
    triggerSync,
  );
  window.addEventListener(
    AUTH_SESSION_CHANGED_EVENT,
    triggerSync,
  );

  triggerSync();

  return () => {
    stopped = true;
    window.clearInterval(
      interval,
    );
    window.removeEventListener(
      "online",
      triggerSync,
    );
    window.removeEventListener(
      "focus",
      triggerSync,
    );
    window.removeEventListener(
      AUTH_SESSION_CHANGED_EVENT,
      triggerSync,
    );
  };
}

function updateOutboxSnapshot(
  changes:
    Partial<AppsScriptSyncSnapshot>,
) {
  outboxSnapshot = {
    ...outboxSnapshot,
    ...changes,
  };

  const snapshot =
    getAppsScriptSyncSnapshot();

  outboxListeners.forEach(
    (listener) => {
      listener(snapshot);
    },
  );
}

function getCurrentSessionUserCode() {
  return String(
    getAuthSession()?.user
      ?.userCode || "",
  )
    .trim()
    .toUpperCase();
}

function getErrorMessage(
  reason: unknown,
) {
  return reason instanceof Error
    ? reason.message
    : String(reason);
}

async function createResponseCacheKey(
  action: string,
  data: unknown,
) {
  const source = JSON.stringify({
    action,
    data,
    transport:
      resolveApiTransport(),
    userCode:
      getCurrentSessionUserCode(),
  });

  if (
    typeof crypto !== "undefined" &&
    crypto.subtle
  ) {
    const digest =
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(
          source,
        ),
      );

    return Array.from(
      new Uint8Array(digest),
    )
      .map((byte) =>
        byte
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  }

  let hash = 2166136261;

  for (
    let index = 0;
    index < source.length;
    index += 1
  ) {
    hash ^= source.charCodeAt(
      index,
    );
    hash = Math.imul(
      hash,
      16777619,
    );
  }

  return `fallback-${(
    hash >>> 0
  ).toString(16)}`;
}

function createRequestId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
}

function wait(milliseconds: number) {
  return new Promise<void>(
    (resolve) => {
      window.setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}
