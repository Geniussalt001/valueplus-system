import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import type { HubSettings, HubStore } from "../types/hubDelivery";
function command<T>(action: string, payload: unknown = {}): Promise<T> { return invoke("hub_delivery_command", { action, payload }); }
export const hubDeliveryService = {
  load: () => command<HubStore>("load"),
  async selectFile() { const result = await open({ multiple: false, directory: false, filters: [{ name: "Excel HUB", extensions: ["xlsx"] }] }); return typeof result === "string" ? result : null; },
  importSource: (path: string) => command<HubStore>("import-source", { path }),
  importTemplate: (path: string) => command<HubStore>("import-template", { path }),
  resetTemplate: () => command<HubStore>("reset-template"),
  saveSettings: (settings: HubSettings) => command<HubStore>("settings", { settings }),
  export: (date: string, codes: string[]) => command<{ store: HubStore; path: string }>("export", { date, codes }),
  async openHistory(id: string) { const result = await command<{ path: string }>("open-history", { id }); await openPath(result.path); },
  openFile: openPath,
};
