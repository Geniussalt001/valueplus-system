import {
  getVersion,
} from "@tauri-apps/api/app";

import {
  relaunch,
} from "@tauri-apps/plugin-process";

import {
  check,
} from "@tauri-apps/plugin-updater";

type AvailableUpdate =
  NonNullable<
    Awaited<
      ReturnType<typeof check>
    >
  >;

export interface UpdateInformation {
  available: boolean;
  currentVersion: string;
  nextVersion?: string;
  notes?: string;
  publishedAt?: string;
  mandatory: boolean;
  minimumSupportedVersion?: string;
  message?: string;
}

interface ParsedUpdatePolicy {
  mandatory: boolean;
  minimumSupportedVersion?: string;
  message?: string;
}

interface StoredUpdateDecision {
  checkedAt: number;
  currentVersion: string;
  available: boolean;
  nextVersion?: string;
  mandatory: boolean;
  minimumSupportedVersion?: string;
}

export interface OfflineUpdateDecision {
  allowed: boolean;
  reason:
    | "allowed"
    | "missing"
    | "expired"
    | "mandatory-update";
}

const POLICY_PATTERN =
  /\[update-policy\]([\s\S]*?)\[\/update-policy\]/i;

const STARTUP_UPDATE_DECISION_KEY =
  "valueplus.startup-update-decision.v1";

export const STARTUP_UPDATE_OFFLINE_GRACE_MS =
  24 * 60 * 60 * 1000;

function normalizeVersion(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, "")
    .split(".")
    .map((part) => {
      const value = Number.parseInt(part, 10);
      return Number.isFinite(value) ? value : 0;
    });
}

export function compareVersions(
  left: string,
  right: string,
): number {
  const leftParts = normalizeVersion(left);
  const rightParts = normalizeVersion(right);
  const length = Math.max(
    leftParts.length,
    rightParts.length,
  );

  for (let index = 0; index < length; index += 1) {
    const difference =
      (leftParts[index] ?? 0) -
      (rightParts[index] ?? 0);

    if (difference !== 0) {
      return difference > 0 ? 1 : -1;
    }
  }

  return 0;
}

export function parseUpdatePolicy(
  notes = "",
): ParsedUpdatePolicy {
  const policyBlock = notes.match(POLICY_PATTERN)?.[1] ?? "";
  const entries = new Map<string, string>();

  for (const line of policyBlock.split(/\r?\n/)) {
    const separator = line.indexOf("=");

    if (separator < 1) {
      continue;
    }

    entries.set(
      line.slice(0, separator).trim().toLowerCase(),
      line.slice(separator + 1).trim(),
    );
  }

  const minimumSupportedVersion =
    entries.get("minimumsupportedversion") || undefined;
  const message = entries.get("message") || undefined;

  return {
    mandatory:
      entries.get("mandatory")?.toLowerCase() === "true",
    minimumSupportedVersion,
    message,
  };
}

export function stripUpdatePolicy(notes = ""): string {
  return notes.replace(POLICY_PATTERN, "").trim();
}

export function rememberSuccessfulUpdateCheck(
  information: UpdateInformation,
): void {
  const decision: StoredUpdateDecision = {
    checkedAt: Date.now(),
    currentVersion:
      information.currentVersion,
    available:
      information.available,
    nextVersion:
      information.nextVersion,
    mandatory:
      information.mandatory,
    minimumSupportedVersion:
      information.minimumSupportedVersion,
  };

  try {
    window.localStorage.setItem(
      STARTUP_UPDATE_DECISION_KEY,
      JSON.stringify(decision),
    );
  } catch {
    // A storage failure must not break a successful online check.
  }
}

export function getOfflineUpdateDecision(
  currentVersion: string,
  now = Date.now(),
): OfflineUpdateDecision {
  let storedValue = "";

  try {
    storedValue =
      window.localStorage.getItem(
        STARTUP_UPDATE_DECISION_KEY,
      ) ?? "";
  } catch {
    return {
      allowed: false,
      reason: "missing",
    };
  }

  if (!storedValue) {
    return {
      allowed: false,
      reason: "missing",
    };
  }

  try {
    const decision = JSON.parse(
      storedValue,
    ) as StoredUpdateDecision;
    const age =
      now - Number(decision.checkedAt);

    if (
      !Number.isFinite(age) ||
      age < 0 ||
      age >
        STARTUP_UPDATE_OFFLINE_GRACE_MS
    ) {
      return {
        allowed: false,
        reason: "expired",
      };
    }

    const belowMinimum = Boolean(
      decision.minimumSupportedVersion &&
        compareVersions(
          currentVersion,
          decision.minimumSupportedVersion,
        ) < 0,
    );
    const belowMandatoryTarget = Boolean(
      decision.mandatory &&
        decision.available &&
        decision.nextVersion &&
        compareVersions(
          currentVersion,
          decision.nextVersion,
        ) < 0,
    );

    if (
      belowMinimum ||
      belowMandatoryTarget
    ) {
      return {
        allowed: false,
        reason: "mandatory-update",
      };
    }

    return {
      allowed: true,
      reason: "allowed",
    };
  } catch {
    return {
      allowed: false,
      reason: "missing",
    };
  }
}

export type UpdateProgressHandler = (
  progress: number,
  downloadedBytes: number,
  totalBytes: number,
) => void;

let pendingUpdate:
  | AvailableUpdate
  | null = null;

export async function getCurrentVersion():
  Promise<string> {
  return getVersion();
}

export async function checkForUpdate():
  Promise<UpdateInformation> {
  const currentVersion =
    await getCurrentVersion();

  pendingUpdate =
    await check();

  if (!pendingUpdate) {
    return {
      available: false,
      currentVersion,
      mandatory: false,
    };
  }

  const notes = pendingUpdate.body ?? "";
  const policy = parseUpdatePolicy(notes);
  const belowMinimum = Boolean(
    policy.minimumSupportedVersion &&
      compareVersions(
        currentVersion,
        policy.minimumSupportedVersion,
      ) < 0,
  );

  return {
    available: true,
    currentVersion,
    nextVersion:
      pendingUpdate.version,
    notes: stripUpdatePolicy(notes),
    publishedAt:
      pendingUpdate.date ??
      "",
    mandatory:
      policy.mandatory || belowMinimum,
    minimumSupportedVersion:
      policy.minimumSupportedVersion,
    message: policy.message,
  };
}

export async function installUpdate(
  onProgress: UpdateProgressHandler,
): Promise<void> {
  if (!pendingUpdate) {
    throw new Error(
      "ไม่พบรายการอัปเดตที่พร้อมติดตั้ง",
    );
  }

  let downloadedBytes = 0;
  let totalBytes = 0;

  await pendingUpdate.downloadAndInstall(
    (event) => {
      switch (event.event) {
        case "Started": {
          totalBytes =
            event.data
              .contentLength ??
            0;

          downloadedBytes = 0;

          onProgress(
            0,
            downloadedBytes,
            totalBytes,
          );

          break;
        }

        case "Progress": {
          downloadedBytes +=
            event.data.chunkLength;

          const progress =
            totalBytes > 0
              ? Math.min(
                  Math.round(
                    (downloadedBytes /
                      totalBytes) *
                      100,
                  ),
                  99,
                )
              : 0;

          onProgress(
            progress,
            downloadedBytes,
            totalBytes,
          );

          break;
        }

        case "Finished": {
          onProgress(
            100,
            totalBytes ||
              downloadedBytes,
            totalBytes ||
              downloadedBytes,
          );

          break;
        }
      }
    },
  );

  await relaunch();
}

export function clearPendingUpdate():
  void {
  pendingUpdate = null;
}
