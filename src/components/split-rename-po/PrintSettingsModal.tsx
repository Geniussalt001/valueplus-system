import {
  Check,
  Minus,
  Plus,
  Printer,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  PoPreviewRecord,
} from "../../types/poProcessor.types";

import type {
  WarehousePrintOption,
  WarehousePrintRequest,
} from "../../types/print.types";

interface PrintSettingsModalProps {
  open: boolean;
  records:
    PoPreviewRecord[];
  disabled?: boolean;
  onClose: () => void;
  onConfirm: (
    warehouses:
      WarehousePrintRequest[],
  ) => void;
}

const warehouseOrder = [
  "มหาชัย",
  "สำโรง",
  "ร่มเกล้า",
  "ชลบุรี",
  "รังสิต",
  "โชคชัย",
  "เชียงใหม่",
  "นครสวรรค์",
  "ขอนแก่น",
  "นครราชสีมา",
  "หาดใหญ่",
  "สุราษฎร์ธานี",
];

export function PrintSettingsModal({
  open,
  records,
  disabled = false,
  onClose,
  onConfirm,
}: PrintSettingsModalProps) {
  const [
    options,
    setOptions,
  ] =
    useState<
      WarehousePrintOption[]
    >([]);

  const [
    allCopies,
    setAllCopies,
  ] = useState(1);

  useEffect(
    () => {
      if (!open) {
        return;
      }

      setOptions(
        createPrintOptions(
          records,
        ),
      );

      setAllCopies(1);
    },
    [
      open,
      records,
    ],
  );

  const selectedCount =
    useMemo(
      () => {
        return options.filter(
          (
            option,
          ) =>
            option.selected,
        ).length;
      },
      [
        options,
      ],
    );

  const allSelected =
    options.length > 0 &&
    selectedCount ===
      options.length;

  if (!open) {
    return null;
  }

  const toggleWarehouse = (
    warehouse: string,
  ) => {
    setOptions(
      (
        current,
      ) =>
        current.map(
          (
            option,
          ) =>
            option.warehouse ===
            warehouse
              ? {
                  ...option,
                  selected:
                    !option.selected,
                }
              : option,
        ),
    );
  };

  const changeCopies = (
    warehouse: string,
    copies: number,
  ) => {
    const safeCopies =
      clampCopies(
        copies,
      );

    setOptions(
      (
        current,
      ) =>
        current.map(
          (
            option,
          ) =>
            option.warehouse ===
            warehouse
              ? {
                  ...option,
                  copies:
                    safeCopies,
                }
              : option,
        ),
    );
  };

  const toggleAll = () => {
    const nextSelected =
      !allSelected;

    setOptions(
      (
        current,
      ) =>
        current.map(
          (
            option,
          ) => ({
            ...option,

            selected:
              nextSelected,
          }),
        ),
    );
  };

  const applyAllCopies = () => {
    const safeCopies =
      clampCopies(
        allCopies,
      );

    setAllCopies(
      safeCopies,
    );

    setOptions(
      (
        current,
      ) =>
        current.map(
          (
            option,
          ) => ({
            ...option,

            selected:
              true,

            copies:
              safeCopies,
          }),
        ),
    );
  };

  const submitPrint = () => {
    const selected =
      options
        .filter(
          (
            option,
          ) =>
            option.selected &&
            option.copies > 0,
        )
        .map(
          (
            option,
          ) => ({
            warehouse:
              option.warehouse,

            sheets:
              option.sheets,

            copies:
              option.copies,
          }),
        );

    if (
      selected.length ===
      0
    ) {
      return;
    }

    onConfirm(
      selected,
    );
  };

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-[#020812]/80
        p-4
        backdrop-blur-sm
      "
    >
      <section
        className="
          flex
          max-h-[90vh]
          w-full
          max-w-3xl
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-cyan-300/20
          bg-[#061524]
          shadow-[0_30px_100px_rgba(0,0,0,0.55)]
        "
      >
        <header
          className="
            flex
            items-start
            justify-between
            gap-5
            border-b
            border-cyan-300/10
            px-6
            py-5
          "
        >
          <div>
            <div className="flex items-center gap-2 text-cyan-300">
              <Printer
                size={18}
              />

              <span className="text-xs font-semibold tracking-[0.16em]">
                PRINT SETTINGS
              </span>
            </div>

            <h2 className="mt-3 text-xl font-semibold text-white">
              เลือกเอกสารที่ต้องการพิมพ์
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              เลือกคลังและกำหนดจำนวนชุด
              ก่อนเข้าสู่หน้าต่างเครื่องพิมพ์
            </p>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={onClose}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              border
              border-slate-700
              text-slate-500
              transition
              hover:border-red-300/30
              hover:text-red-300
              disabled:opacity-40
            "
          >
            <X size={17} />
          </button>
        </header>

        <div
          className="
            border-b
            border-cyan-300/10
            bg-cyan-300/[0.025]
            px-6
            py-4
          "
        >
          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <button
              type="button"
              disabled={
                disabled ||
                options.length ===
                  0
              }
              onClick={toggleAll}
              className="
                flex
                items-center
                gap-3
                text-left
                text-sm
                text-slate-300
                disabled:opacity-40
              "
            >
              <SelectionBox
                selected={
                  allSelected
                }
              />

              เลือกทุกคลัง
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                จำนวนชุดทุกคลัง
              </span>

              <input
                type="number"
                min={1}
                max={99}
                value={
                  allCopies
                }
                disabled={disabled}
                onChange={(
                  event,
                ) => {
                  setAllCopies(
                    clampCopies(
                      Number(
                        event
                          .target
                          .value,
                      ),
                    ),
                  );
                }}
                className="
                  h-9
                  w-16
                  rounded-lg
                  border
                  border-slate-700
                  bg-[#020b16]
                  text-center
                  text-sm
                  text-white
                  outline-none
                  focus:border-cyan-300/40
                "
              />

              <button
                type="button"
                disabled={disabled}
                onClick={
                  applyAllCopies
                }
                className="
                  h-9
                  rounded-lg
                  border
                  border-cyan-300/20
                  bg-cyan-300/[0.07]
                  px-4
                  text-xs
                  text-cyan-200
                  transition
                  hover:bg-cyan-300/[0.12]
                  disabled:opacity-40
                "
              >
                ใช้กับทุกคลัง
              </button>
            </div>
          </div>
        </div>

        <div
          className="
            flex-1
            space-y-2
            overflow-y-auto
            p-4
          "
        >
          {options.map(
            (
              option,
            ) => (
              <div
                key={
                  option.warehouse
                }
                className={`
                  flex
                  flex-col
                  gap-4
                  rounded-xl
                  border
                  px-4
                  py-4
                  transition
                  sm:flex-row
                  sm:items-center
                  ${
                    option.selected
                      ? "border-cyan-300/25 bg-cyan-300/[0.055]"
                      : "border-slate-800 bg-[#020b16]/55"
                  }
                `}
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    toggleWarehouse(
                      option.warehouse,
                    );
                  }}
                  className="
                    flex
                    min-w-0
                    flex-1
                    items-center
                    gap-3
                    text-left
                    disabled:opacity-40
                  "
                >
                  <SelectionBox
                    selected={
                      option.selected
                    }
                  />

                  <span className="min-w-0">
                    <span className="block font-medium text-white">
                      {
                        option.warehouse
                      }
                    </span>

                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {
                        option.sheets.join(
                          ", ",
                        )
                      }
                    </span>
                  </span>
                </button>

                <div className="flex items-center justify-end gap-2">
                  <span className="mr-2 text-xs text-slate-500">
                    จำนวนชุด
                  </span>

                  <button
                    type="button"
                    disabled={
                      disabled ||
                      !option.selected
                    }
                    onClick={() => {
                      changeCopies(
                        option.warehouse,
                        option.copies -
                          1,
                      );
                    }}
                    className="
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-lg
                      border
                      border-slate-700
                      text-slate-400
                      transition
                      hover:border-cyan-300/30
                      hover:text-cyan-300
                      disabled:opacity-30
                    "
                  >
                    <Minus
                      size={15}
                    />
                  </button>

                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={
                      option.copies
                    }
                    disabled={
                      disabled ||
                      !option.selected
                    }
                    onChange={(
                      event,
                    ) => {
                      changeCopies(
                        option.warehouse,

                        Number(
                          event
                            .target
                            .value,
                        ),
                      );
                    }}
                    className="
                      h-9
                      w-16
                      rounded-lg
                      border
                      border-slate-700
                      bg-[#020b16]
                      text-center
                      text-sm
                      text-white
                      outline-none
                      focus:border-cyan-300/40
                      disabled:opacity-30
                    "
                  />

                  <button
                    type="button"
                    disabled={
                      disabled ||
                      !option.selected
                    }
                    onClick={() => {
                      changeCopies(
                        option.warehouse,
                        option.copies +
                          1,
                      );
                    }}
                    className="
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-lg
                      border
                      border-slate-700
                      text-slate-400
                      transition
                      hover:border-cyan-300/30
                      hover:text-cyan-300
                      disabled:opacity-30
                    "
                  >
                    <Plus
                      size={15}
                    />
                  </button>
                </div>
              </div>
            ),
          )}

          {options.length ===
            0 && (
            <div className="py-14 text-center text-sm text-slate-500">
              ไม่พบคลังที่มีข้อมูลสำหรับพิมพ์
            </div>
          )}
        </div>

        <footer
          className="
            flex
            flex-col-reverse
            gap-3
            border-t
            border-cyan-300/10
            px-6
            py-5
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <p className="text-xs text-slate-500">
            เลือกแล้ว{" "}
            <span className="font-semibold text-cyan-300">
              {selectedCount}
            </span>{" "}
            คลัง
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={onClose}
              className="
                rounded-xl
                border
                border-slate-700
                px-5
                py-3
                text-sm
                text-slate-400
                transition
                hover:text-white
                disabled:opacity-40
              "
            >
              ยกเลิก
            </button>

            <button
              type="button"
              disabled={
                disabled ||
                selectedCount ===
                  0
              }
              onClick={
                submitPrint
              }
              className="
                flex
                items-center
                gap-2
                rounded-xl
                border
                border-cyan-300/30
                bg-cyan-300/10
                px-6
                py-3
                text-sm
                font-medium
                text-cyan-200
                transition
                hover:bg-cyan-300/15
                disabled:cursor-not-allowed
                disabled:opacity-35
              "
            >
              <Printer
                size={17}
              />

              ไปหน้าต่างเครื่องพิมพ์
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function SelectionBox({
  selected,
}: {
  selected: boolean;
}) {
  return (
    <span
      className={`
        flex
        h-5
        w-5
        shrink-0
        items-center
        justify-center
        rounded-md
        border
        ${
          selected
            ? "border-cyan-300 bg-cyan-300 text-[#020812]"
            : "border-slate-600 bg-transparent text-transparent"
        }
      `}
    >
      <Check size={13} />
    </span>
  );
}

function createPrintOptions(
  records:
    PoPreviewRecord[],
): WarehousePrintOption[] {
  const warehouseSheets =
    new Map<
      string,
      Set<string>
    >();

  for (
    const record of records
  ) {
    if (
      record.status !==
      "ready"
    ) {
      continue;
    }

    const currentSheets =
      warehouseSheets.get(
        record.warehouse,
      ) ??
      new Set<string>();

    currentSheets.add(
      record.target_sheet,
    );

    warehouseSheets.set(
      record.warehouse,
      currentSheets,
    );
  }

  return Array.from(
    warehouseSheets.entries(),
  )
    .map(
      ([
        warehouse,
        sheets,
      ]) => ({
        warehouse,
        sheets:
          Array.from(
            sheets,
          ),
        selected: true,
        copies: 1,
      }),
    )
    .sort(
      (
        first,
        second,
      ) => {
        return (
          getWarehouseIndex(
            first.warehouse,
          ) -
          getWarehouseIndex(
            second.warehouse,
          )
        );
      },
    );
}

function getWarehouseIndex(
  warehouse: string,
): number {
  const index =
    warehouseOrder.indexOf(
      warehouse,
    );

  return index === -1
    ? 999
    : index;
}

function clampCopies(
  value: number,
): number {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 1;
  }

  return Math.min(
    99,
    Math.max(
      1,
      Math.trunc(
        value,
      ),
    ),
  );
}