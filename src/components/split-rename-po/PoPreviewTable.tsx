import {
  CheckCircle2,
  CircleAlert,
  TriangleAlert,
} from "lucide-react";

import type {
  PoPreviewRecord,
  PoQuantityOverrides,
} from "../../types/poProcessor.types";

import {
  getEffectivePoQuantity,
} from "../../utils/poQuantity";

interface PoPreviewTableProps {
  records:
    PoPreviewRecord[];
  quantityOverrides?:
    PoQuantityOverrides;
}

export function PoPreviewTable({
  records,
  quantityOverrides = {},
}: PoPreviewTableProps) {
  return (
    <div
      className="
        vp-data-card
        overflow-hidden
        rounded-2xl
        border
        border-cyan-300/15
        bg-[#04111f]/85
      "
    >
      <div className="border-b border-cyan-300/10 px-5 py-4">
        <p className="text-sm font-semibold text-white">
          รายการ Preview
        </p>

        <p className="mt-1 text-xs text-slate-500">
          ตรวจสอบคลัง, PO,
          IV และการจับคู่สินค้า
          ก่อนสร้างไฟล์ Excel
        </p>
      </div>

      <div className="overflow-x-auto">
        <table
          className="
            w-full
            min-w-[980px]
            text-left
          "
        >
          <thead
            className="
              border-b
              border-cyan-300/10
              bg-white/[0.025]
              text-[10px]
              tracking-[0.14em]
              text-slate-500
            "
          >
            <tr>
              <th className="px-5 py-4">
                ลำดับ
              </th>

              <th className="px-5 py-4">
                คลัง / ชีต
              </th>

              <th className="px-5 py-4">
                PO NUMBER
              </th>

              <th className="px-5 py-4">
                IV NUMBER
              </th>

              <th className="px-5 py-4">
                วันที่
              </th>

              <th className="px-5 py-4">
                หน้า PDF
              </th>

              <th className="px-5 py-4">
                สินค้า
              </th>

              <th className="px-5 py-4">
                สถานะ
              </th>
            </tr>
          </thead>

          <tbody
            className="
              divide-y
              divide-cyan-300/[0.07]
              text-sm
            "
          >
            {records.map(
              (
                record,
              ) => (
                <tr
                  key={`${record.po_number}-${record.sequence}`}
                  className="
                    transition
                    hover:bg-cyan-300/[0.025]
                  "
                >
                  <td className="px-5 py-4 text-slate-500">
                    {String(
                      record.sequence,
                    ).padStart(
                      2,
                      "0",
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <p className="font-medium text-white">
                      {
                        record.warehouse
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {
                        record.target_sheet
                      }
                    </p>
                  </td>

                  <td className="px-5 py-4 text-slate-300">
                    {
                      record.po_number
                    }
                  </td>

                  <td className="px-5 py-4 font-medium text-cyan-200">
                    {
                      record.iv_number
                    }
                  </td>

                  <td className="px-5 py-4 text-slate-400">
                    {
                      record.document_date
                    }
                  </td>

                  <td className="px-5 py-4 text-slate-400">
                    {
                      record.pages.join(
                        ", ",
                      )
                    }
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-slate-300">
                      {
                        record.matched_count
                      }
                      /
                      {
                        record.item_count
                      }
                    </p>

                    <p className="mt-1 text-[10px] text-slate-600">
                      MATCHED
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        font-semibold
                        text-cyan-700
                      "
                    >
                      {formatNumber(
                        getRecordQuantity(
                          record,
                          quantityOverrides,
                        ),
                      )} ชิ้น
                    </p>

                    {getExcludedCount(
                      record,
                      quantityOverrides,
                    ) > 0 && (
                      <p
                        className="
                          mt-1
                          text-[10px]
                          font-semibold
                          text-red-600
                        "
                      >
                        ไม่ส่งสินค้า{" "}
                        {getExcludedCount(
                          record,
                          quantityOverrides,
                        )} รายการ
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <RecordStatus
                      record={
                        record
                      }
                    />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {records.length ===
        0 && (
        <div className="px-5 py-16 text-center">
          <p className="text-sm text-slate-500">
            ยังไม่มีข้อมูล
            Preview
          </p>
        </div>
      )}
    </div>
  );
}

function RecordStatus({
  record,
}: {
  record:
    PoPreviewRecord;
}) {
  if (
    record.status ===
    "ready"
  ) {
    return (
      <div
        className="
          inline-flex
          items-center
          gap-2
          rounded-full
          border
          border-emerald-300/15
          bg-emerald-300/[0.06]
          px-3
          py-1.5
          text-xs
          text-emerald-300
        "
      >
        <span
          className="status-light status-success"
          aria-hidden="true"
        />

        <CheckCircle2
          size={14}
        />

        พร้อมสร้าง
      </div>
    );
  }

  if (
    record.status ===
    "review"
  ) {
    return (
      <div
        title={
          record.message
        }
        className="
          inline-flex
          items-center
          gap-2
          rounded-full
          border
          border-amber-300/15
          bg-amber-300/[0.06]
          px-3
          py-1.5
          text-xs
          text-amber-300
        "
      >
        <span
          className="status-light status-waiting"
          aria-hidden="true"
        />

        <TriangleAlert
          size={14}
        />

        รอตรวจสอบ
      </div>
    );
  }

  return (
    <div
      title={
        record.message
      }
      className="
        inline-flex
        items-center
        gap-2
        rounded-full
        border
        border-red-300/15
        bg-red-300/[0.06]
        px-3
        py-1.5
        text-xs
        text-red-300
      "
    >
      <span
        className="status-light status-error"
        aria-hidden="true"
      />

      <CircleAlert
        size={14}
      />

      ผิดพลาด
    </div>
  );
}

function getRecordQuantity(
  record: PoPreviewRecord,
  overrides: PoQuantityOverrides,
): number {
  return record.items.reduce(
    (total, item) =>
      total +
      getEffectivePoQuantity(
        record,
        item,
        overrides,
      ),
    0,
  );
}

function getExcludedCount(
  record: PoPreviewRecord,
  overrides: PoQuantityOverrides,
): number {
  return record.items.filter(
    (item) =>
      item.matched &&
      item.excel_row !== null &&
      getEffectivePoQuantity(
        record,
        item,
        overrides,
      ) === 0,
  ).length;
}

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    "th-TH",
    {
      maximumFractionDigits: 2,
    },
  ).format(value);
}
