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
    };
  }

  return {
    available: true,
    currentVersion,
    nextVersion:
      pendingUpdate.version,
    notes:
      pendingUpdate.body ??
      "",
    publishedAt:
      pendingUpdate.date ??
      "",
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