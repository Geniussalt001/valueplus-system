import type {
  PoRecord,
  PoStatusOption,
} from "./poData.types";

export const poStatusOptions: PoStatusOption[] = [
  {
    value: "waiting",
    label: "รอเอกสาร",
    badgeClass:
      "border-amber-300/20 bg-amber-300/10 text-amber-200",
    dotClass: "bg-amber-300 shadow-[0_0_8px_#fcd34d]",
  },
  {
    value: "reviewing",
    label: "กำลังตรวจสอบ",
    badgeClass:
      "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
    dotClass: "bg-cyan-300 shadow-[0_0_8px_#67e8f9]",
  },
  {
    value: "complete",
    label: "สมบูรณ์",
    badgeClass:
      "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
    dotClass:
      "bg-emerald-300 shadow-[0_0_8px_#6ee7b7]",
  },
  {
    value: "issue",
    label: "พบปัญหา",
    badgeClass:
      "border-red-300/20 bg-red-300/10 text-red-200",
    dotClass: "bg-red-300 shadow-[0_0_8px_#fca5a5]",
  },
];

export const initialPoRecords: PoRecord[] = [
  {
    id: "PO-001",
    ivNumber: "IV26070001",
    poNumber: "B012700170",
    documentDate: "2026-07-15",
    assignee: "สำนักงานใหญ่",
    branch: "มหาชัย",
    status: "waiting",
    createdAt: "2026-07-15T08:30:00",
  },
  {
    id: "PO-002",
    ivNumber: "IV26070002",
    poNumber: "B012700171",
    documentDate: "2026-07-15",
    assignee: "คลังสินค้า",
    branch: "สำโรง",
    status: "reviewing",
    createdAt: "2026-07-15T09:10:00",
  },
  {
    id: "PO-003",
    ivNumber: "IV26070003",
    poNumber: "B012700172",
    documentDate: "2026-07-15",
    assignee: "สำนักงานใหญ่",
    branch: "ร่มเกล้า",
    status: "complete",
    createdAt: "2026-07-15T09:45:00",
  },
];