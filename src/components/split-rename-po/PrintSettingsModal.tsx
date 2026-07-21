import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ChevronDown,
  ChevronUp,
  Printer,
  X,
} from "lucide-react";

interface PrintRecord {
  warehouse: string;
  target_sheet: string;
  status?: string;
}

interface PrintWarehouseJob {
  warehouse: string;
  sheets: string[];
  copies: number;
}

interface PrintSettingsModalProps {
  open: boolean;
  records: PrintRecord[];
  disabled?: boolean;
  onClose: () => void;
  onConfirm: (
    warehouses: PrintWarehouseJob[],
  ) => void;
}

interface PrintRow {
  id: string;
  warehouse: string;
  sheet: string;
  copies: number;
}

const clampCopies = (
  value: number,
) => Math.max(
  0,
  Math.min(
    99,
    Number.isFinite(value)
      ? Math.trunc(value)
      : 0,
  ),
);

export function PrintSettingsModal({
  open,
  records,
  disabled = false,
  onClose,
  onConfirm,
}: PrintSettingsModalProps) {
  const [defaultCopies, setDefaultCopies] =
    useState(1);
  const [rows, setRows] =
    useState<PrintRow[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const seenSheets = new Set<string>();
    const nextRows = records
      .filter((record) => (
        record.status !== "error" &&
        Boolean(record.target_sheet?.trim())
      ))
      .filter((record) => {
        const sheet = record.target_sheet.trim();
        if (seenSheets.has(sheet)) {
          return false;
        }

        seenSheets.add(sheet);
        return true;
      })
      .map((record, index) => ({
        id: `${record.target_sheet}-${index}`,
        warehouse: record.warehouse,
        sheet: record.target_sheet,
        copies: defaultCopies,
      }));

    setRows(nextRows);
  }, [open, records]);

  const selectedCount = useMemo(
    () => rows.filter(
      (row) => row.copies > 0,
    ).length,
    [rows],
  );

  if (!open) {
    return null;
  }

  const changeAllCopies = (
    rawValue: number,
  ) => {
    const copies = clampCopies(rawValue);
    setDefaultCopies(copies);
    setRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        copies,
      })),
    );
  };

  const changeRowCopies = (
    id: string,
    rawValue: number,
  ) => {
    const copies = clampCopies(rawValue);
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === id
          ? { ...row, copies }
          : row,
      ),
    );
  };

  const moveRow = (
    index: number,
    direction: -1 | 1,
  ) => {
    const targetIndex = index + direction;
    if (
      targetIndex < 0 ||
      targetIndex >= rows.length
    ) {
      return;
    }

    setRows((currentRows) => {
      const nextRows = [...currentRows];
      [nextRows[index], nextRows[targetIndex]] =
        [nextRows[targetIndex], nextRows[index]];
      return nextRows;
    });
  };

  const confirmPrint = () => {
    const jobs = rows
      .filter((row) => row.copies > 0)
      .map((row) => ({
        warehouse: row.warehouse,
        sheets: [row.sheet],
        copies: row.copies,
      }));

    if (jobs.length === 0) {
      return;
    }

    onConfirm(jobs);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-900 shadow-2xl">
        <header className="flex items-center justify-between gap-4 px-7 py-6">
          <div className="flex items-center gap-3">
            <Printer className="text-violet-600" size={25} />
            <div>
              <h2 className="text-xl font-bold">ตั้งค่าการพิมพ์</h2>
              <p className="mt-1 text-xs text-slate-500">
                ตั้งจำนวนเป็น 0 เพื่อข้ามคลังที่ไม่ต้องการพิมพ์
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
        </header>

        <div className="mx-7 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <p className="font-semibold">กำหนดจำนวนพิมพ์เริ่มต้น (ทุกคลัง)</p>
            <p className="mt-1 text-xs text-slate-500">0 = ไม่พิมพ์คลังนั้น</p>
          </div>
          <input
            type="number"
            min={0}
            max={99}
            step={1}
            value={defaultCopies}
            onChange={(event) => {
              changeAllCopies(Number(event.target.value));
            }}
            className="h-12 w-24 rounded-xl border border-blue-400 bg-white px-3 text-center text-lg font-bold outline-none ring-blue-100 focus:ring-4"
          />
        </div>

        <div className="mx-7 mt-5 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className={`mb-2 flex items-center gap-3 rounded-xl border px-4 py-3 last:mb-0 ${
                row.copies === 0
                  ? "border-slate-200 bg-slate-100 opacity-60"
                  : "border-slate-200 bg-white"
              }`}
            >
              <span className="w-8 text-sm font-bold text-slate-400">
                {index + 1}.
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{row.sheet}</p>
                {row.copies === 0 && (
                  <p className="mt-0.5 text-xs font-medium text-rose-500">ไม่พิมพ์</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => moveRow(index, -1)}
                disabled={disabled || index === 0}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 disabled:opacity-25"
                aria-label="เลื่อนขึ้น"
              >
                <ChevronUp size={17} />
              </button>
              <button
                type="button"
                onClick={() => moveRow(index, 1)}
                disabled={disabled || index === rows.length - 1}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 disabled:opacity-25"
                aria-label="เลื่อนลง"
              >
                <ChevronDown size={17} />
              </button>

              <input
                type="number"
                min={0}
                max={99}
                step={1}
                value={row.copies}
                disabled={disabled}
                onChange={(event) => {
                  changeRowCopies(
                    row.id,
                    Number(event.target.value),
                  );
                }}
                className="h-12 w-20 rounded-xl border border-slate-300 bg-white px-2 text-center text-base font-bold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:opacity-40"
                aria-label={`จำนวนพิมพ์ ${row.sheet}`}
              />
            </div>
          ))}
        </div>

        <footer className="p-7">
          <button
            type="button"
            onClick={confirmPrint}
            disabled={disabled || selectedCount === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            <Printer size={19} />
            {selectedCount > 0
              ? `ยืนยันสั่งพิมพ์ ${selectedCount} คลัง`
              : "กรุณาเลือกอย่างน้อย 1 คลัง"}
          </button>
        </footer>
      </div>
    </div>
  );
}
