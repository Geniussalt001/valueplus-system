import type {
  PoRecord,
  PoStatusOption,
} from "./poData.types";

export const poStatusOptions: PoStatusOption[] = [
  {
    value: "waiting",
    label: "รอเอกสาร",
    badgeClass:
      "border-amber-300/25 bg-amber-300/10 text-amber-200",
    dotClass:
      "bg-amber-300 shadow-[0_0_10px_#fcd34d]",
  },
  {
    value: "reviewing",
    label: "กำลังตรวจสอบ",
    badgeClass:
      "border-yellow-300/25 bg-yellow-300/10 text-yellow-200",
    dotClass:
      "bg-yellow-300 shadow-[0_0_10px_#fde047]",
  },
  {
    value: "complete",
    label: "สมบูรณ์",
    badgeClass:
      "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
    dotClass:
      "bg-emerald-300 shadow-[0_0_10px_#6ee7b7]",
  },
  {
    value: "issue",
    label: "พบปัญหา",
    badgeClass:
      "border-red-300/25 bg-red-300/10 text-red-200",
    dotClass:
      "bg-red-300 shadow-[0_0_10px_#fca5a5]",
  },
];

export const initialPoRecords: PoRecord[] = [];