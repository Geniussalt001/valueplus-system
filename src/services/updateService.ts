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

const POLICY_PATTERN =
  /\[update-policy\]([\s\S]*?)\[\/update-policy\]/i;

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
