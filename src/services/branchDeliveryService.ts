import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import type { BranchDeliveryNote, BranchDeliveryStore, DeliveryBranch } from "../types/branchDelivery";
import { renderDeliveryHtml } from "./branchDeliveryTemplate";

export const branchDeliveryService = {
  load: () => invoke<BranchDeliveryStore>("load_branch_delivery"),
  saveBranch: (branch: DeliveryBranch) => invoke<BranchDeliveryStore>("save_delivery_branch", { branch }),
  saveNote: (note: BranchDeliveryNote) => invoke<BranchDeliveryStore>("save_branch_delivery_note", { note }),
  async print(note: BranchDeliveryNote) {
    const path = await invoke<string>("export_branch_delivery_html", { number: note.number, html: renderDeliveryHtml(note) });
    await openPath(path);
  },
};
