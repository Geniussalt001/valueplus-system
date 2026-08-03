import {
  useEffect,
  useState,
} from "react";

import {
  CloudUpload,
  RefreshCw,
} from "lucide-react";

import {
  getAppsScriptSyncSnapshot,
  subscribeAppsScriptSync,
  syncAppsScriptOutbox,
} from "../services/appsScriptClient";

export function AppsScriptSyncStatus() {
  const [snapshot, setSnapshot] =
    useState(
      getAppsScriptSyncSnapshot,
    );

  useEffect(
    () =>
      subscribeAppsScriptSync(
        setSnapshot,
      ),
    [],
  );

  if (
    snapshot.pendingCount === 0 &&
    !snapshot.syncing
  ) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        void syncAppsScriptOutbox()
          .catch(() => {
            // Keep the pending indicator visible; automatic sync
            // will retry without interrupting the current page.
          });
      }}
      disabled={snapshot.syncing}
      className="hidden min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:cursor-wait sm:flex"
      title="กดเพื่อลองซิงก์งานที่เก็บไว้ในเครื่อง"
    >
      {snapshot.syncing ? (
        <RefreshCw
          size={15}
          className="animate-spin"
        />
      ) : (
        <CloudUpload size={15} />
      )}

      <span className="text-[11px] font-semibold">
        {snapshot.syncing
          ? "กำลังซิงก์"
          : `รอซิงก์ ${snapshot.pendingCount} งาน`}
      </span>
    </button>
  );
}
