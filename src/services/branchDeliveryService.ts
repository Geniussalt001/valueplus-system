import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import type { BranchDeliveryNote, BranchDeliveryStore, DeliveryBranch } from "../types/branchDelivery";
import { renderDeliveryHtml } from "./branchDeliveryTemplate";

export const branchDeliveryService = {
  load: () => invoke<BranchDeliveryStore>("load_branch_delivery"),
  saveBranch: (branch: DeliveryBranch) => invoke<BranchDeliveryStore>("save_delivery_branch", { branch }),
  saveNote: (note: BranchDeliveryNote) => invoke<BranchDeliveryStore>("save_branch_delivery_note", { note }),
  async print(note: BranchDeliveryNote) {
    const response = await fetch("/images/valueplus-logo.png");
    if (!response.ok) throw new Error("โหลดโลโก้สำหรับเอกสารไม่สำเร็จ");
    const blob = await response.blob();
    const logo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("อ่านโลโก้ไม่สำเร็จ"));
      reader.readAsDataURL(blob);
    });
    const path = await invoke<string>("export_branch_delivery_html", { number: note.number, html: renderDeliveryHtml(note, logo) });
    await openPath(path);
  },
};
