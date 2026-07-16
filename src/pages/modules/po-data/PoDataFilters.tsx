import { Search } from "lucide-react";

import { poStatusOptions } from "./poData.config";
import type { PoStatus } from "./poData.types";

interface PoDataFiltersProps {
  search: string;
  status: "all" | PoStatus;
  onSearchChange: (value: string) => void;
  onStatusChange: (
    value: "all" | PoStatus,
  ) => void;
}

export function PoDataFilters({
  search,
  status,
  onSearchChange,
  onStatusChange,
}: PoDataFiltersProps) {
  return (
    <section className="mt-7 flex flex-col gap-4 rounded-2xl border border-cyan-300/10 bg-[#051322]/70 p-4 md:flex-row">
      <label className="relative flex-1">
        <Search
          size={17}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
        />

        <input
          value={search}
          onChange={(event) =>
            onSearchChange(
              event.target.value,
            )
          }
          placeholder="ค้นหา PO, IV, Reference, Customer name หรือ Assignee..."
          className="h-11 w-full rounded-xl border border-slate-700/70 bg-[#020b16]/70 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40"
        />
      </label>

      <select
        value={status}
        onChange={(event) =>
          onStatusChange(
            event.target.value as
              | "all"
              | PoStatus,
          )
        }
        className="h-11 rounded-xl border border-slate-700/70 bg-[#020b16] px-4 text-sm text-slate-300 outline-none focus:border-cyan-300/40"
      >
        <option value="all">
          ทุกสถานะ
        </option>

        {poStatusOptions.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </section>
  );
}