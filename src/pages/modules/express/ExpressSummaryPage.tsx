import {
  useEffect,
  useState,
} from "react";

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Building2,
  Check,
  Copy,
  Database,
  FileSpreadsheet,
  LoaderCircle,
  Play,
  TriangleAlert,
  Upload,
} from "lucide-react";

import {
  expressSummaryService,
} from "../../../services/expressSummaryService";

import type {
  ExpressInvoice,
  ExpressSummaryResult,
} from "../../../types/expressSummary.types";

interface ExpressSummaryPageProps {
  onBack: () => void;
  onNextProcess: () => void;
}

export function ExpressSummaryPage({
  onBack,
  onNextProcess,
}: ExpressSummaryPageProps) {
  const [
    csvPath,
    setCsvPath,
  ] = useState(
    "",
  );

  const [
    processing,
    setProcessing,
  ] = useState(
    false,
  );

  const [
    error,
    setError,
  ] = useState(
    "",
  );

  const [
    result,
    setResult,
  ] = useState<
    ExpressSummaryResult | null
  >(
    null,
  );

  const chooseCsv = async () => {
    if (processing) {
      return;
    }

    try {
      setError(
        "",
      );

      const selected =
        await expressSummaryService
          .selectCsv();

      if (!selected) {
        return;
      }

      setCsvPath(
        selected,
      );

      setResult(
        null,
      );
    } catch (reason) {
      setError(
        getErrorMessage(
          reason,
        ),
      );
    }
  };

  const processCsv = async () => {
    if (
      processing ||
      !csvPath
    ) {
      return;
    }

    setProcessing(
      true,
    );

    setError(
      "",
    );

    try {
      const nextResult =
        await expressSummaryService
          .process({
            csvPath,
          });

      setResult(
        nextResult,
      );
    } catch (reason) {
      setResult(
        null,
      );

      setError(
        getErrorMessage(
          reason,
        ),
      );
    } finally {
      setProcessing(
        false,
      );
    }
  };

  return (
    <div
      className="
        vp-work-page
        express-summary-workspace
        mx-auto
        max-w-[1700px]
        px-6
        py-8
        lg:px-10
      "
    >
      <header
        className="
          vp-page-header
          flex
          flex-col
          justify-between
          gap-5
          md:flex-row
          md:items-end
        "
      >
        <div>
          <button
            type="button"
            onClick={onBack}
            disabled={processing}
            className="
              mb-5
              flex
              items-center
              gap-2
              text-sm
              text-slate-500
              transition
              hover:text-cyan-300
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            <ArrowLeft
              size={17}
            />

            กลับหน้าเลือกประเภทสรุปยอด
          </button>

          <p
            className="
              text-[10px]
              font-semibold
              tracking-[0.24em]
              text-cyan-300
            "
          >
            EXPRESS SUMMARY
          </p>

          <h2
            className="
              mt-2
              text-3xl
              font-semibold
              text-white
            "
          >
            สรุปยอด Express
          </h2>

          <p
            className="
              mt-3
              max-w-3xl
              text-sm
              leading-6
              text-slate-400
            "
          >
            อ่านเลข IV คลัง รายการสินค้า
            และจำนวนจากไฟล์ CSV
            พร้อมสรุปผลแยกคลังแบบ Realtime
          </p>
        </div>

        <div
          className="
            vp-page-icon
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-xl
            border
            border-cyan-300/20
            bg-cyan-300/[0.07]
            text-cyan-300
          "
        >
          <Activity size={23} />
        </div>
      </header>

      <section
        className="
          vp-setup-card
          mt-7
          rounded-2xl
          border
          border-cyan-300/20
          bg-[#071827]
          p-5
        "
      >
        <div
          className="
            vp-action-bar
            flex
            flex-col
            gap-4
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >
          <button
            type="button"
            onClick={() => {
              void chooseCsv();
            }}
            disabled={processing}
            className="
              vp-upload-card
              flex
              min-w-0
              flex-1
              items-center
              gap-4
              rounded-xl
              border
              border-cyan-300/20
              bg-cyan-300/[0.06]
              px-5
              py-4
              text-left
              transition
              hover:border-cyan-300/40
              hover:bg-cyan-300/[0.1]
              disabled:cursor-not-allowed
              disabled:opacity-45
            "
          >
            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-cyan-300/25
                bg-cyan-300/10
                text-cyan-300
              "
            >
              <Upload size={19} />
            </div>

            <div className="min-w-0">
              <p
                className="
                  text-sm
                  font-medium
                  text-white
                "
              >
                อัปโหลดไฟล์ CSV
              </p>

              <p
                className={`
                  mt-1
                  truncate
                  text-xs
                  ${
                    csvPath
                      ? "text-emerald-300"
                      : "text-slate-500"
                  }
                `}
              >
                {
                  csvPath ||
                  "คลิกเพื่อเลือกไฟล์ CSV"
                }
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={
              processing ||
              !csvPath
            }
            onClick={() => {
              void processCsv();
            }}
            className="
              vp-action-button
              vp-action-success
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-emerald-300/30
              bg-emerald-300/10
              px-7
              py-4
              text-sm
              font-medium
              text-emerald-200
              transition
              hover:-translate-y-0.5
              hover:bg-emerald-300/15
              disabled:cursor-not-allowed
              disabled:opacity-35
            "
          >
            {processing ? (
              <LoaderCircle
                className="animate-spin"
                size={18}
              />
            ) : (
              <Play size={18} />
            )}

            {processing
              ? "กำลังประมวลผล..."
              : "ประมวลผล CSV"}
          </button>
        </div>
      </section>

      {error && (
        <div
          className="
            mt-5
            flex
            items-start
            gap-3
            rounded-xl
            border
            border-red-300/20
            bg-red-300/[0.07]
            px-5
            py-4
            text-sm
            leading-6
            text-red-200
          "
        >
          <TriangleAlert
            className="mt-0.5 shrink-0"
            size={18}
          />

          <div>
            <p className="font-medium">
              ไม่สามารถประมวลผล CSV ได้
            </p>

            <p
              className="
                mt-1
                text-xs
                text-red-200/80
              "
            >
              {error}
            </p>
          </div>
        </div>
      )}

      {result?.catalog && (
        <div
          className="
            mt-5
            flex
            items-start
            gap-3
            rounded-xl
            border
            border-emerald-300/20
            bg-emerald-300/[0.07]
            px-5
            py-4
            text-sm
            leading-6
            text-emerald-200
          "
        >
          <Database
            className="mt-0.5 shrink-0"
            size={18}
          />

          <div className="min-w-0">
            <p className="font-medium">
              {result.catalog.status ===
              "already_imported"
                ? "ไฟล์นี้เคยอัปเดตฐานข้อมูลสินค้าแล้ว"
                : "อัปเดตฐานข้อมูลสินค้าเรียบร้อยแล้ว"}
            </p>

            <p
              className="
                mt-1
                text-xs
                text-emerald-200/80
              "
            >
              พบสินค้า {result.catalog.discovered_products.toLocaleString("th-TH")} รายการ
              {" · "}
              เพิ่มใหม่ {result.catalog.new_products.toLocaleString("th-TH")} รายการ
              {" · "}
              อัปเดต {result.catalog.updated_products.toLocaleString("th-TH")} รายการ
            </p>

            <p
              className="
                mt-1
                truncate
                text-[11px]
                text-emerald-200/55
              "
              title={
                result.catalog.database_path
              }
            >
              {result.catalog.database_path}
            </p>
          </div>
        </div>
      )}

      <div
        className="
          mt-6
          grid
          min-w-0
          gap-5
          xl:h-[calc(100vh-350px)]
          xl:min-h-[620px]
          xl:overflow-hidden
          xl:grid-cols-[minmax(0,1fr)_340px]
        "
      >
        <section
          className="
            grid
            h-full
            min-w-0
            auto-rows-max
            content-start
            items-start
            gap-4
            md:grid-cols-2
            lg:grid-cols-3
            xl:overflow-y-auto
            xl:pr-2
          "
        >
          {result ? (
            result.invoices.map((invoice) => (
              <WarehouseCard
                key={
                  invoice.iv_number
                }
                data={invoice}
              />
            ))
          ) : (
            <div
              className="
                col-span-full
                flex
                min-h-[420px]
                flex-col
                items-center
                justify-center
                rounded-2xl
                border
                border-dashed
                border-slate-700
                bg-slate-800/15
                text-center
                text-slate-600
              "
            >
              <FileSpreadsheet
                size={34}
              />

              <p
                className="
                  mt-3
                  text-xs
                "
              >
                Card แต่ละคลังจะแสดงที่นี่
                หลังประมวลผล CSV
              </p>
            </div>
          )}
        </section>

        <RealtimeCard
          result={result}
          onNextProcess={onNextProcess}
        />
      </div>
    </div>
  );
}

function WarehouseCard({
  data,
}: {
  data: ExpressInvoice;
}) {
  return (
    <article
      className="
        h-fit
        min-w-0
        self-start
        overflow-hidden
        rounded-2xl
        border
        border-cyan-300/20
        bg-cyan-300/[0.055]
        transition
        hover:-translate-y-0.5
        hover:border-cyan-300/35
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-3
          border-b
          border-cyan-300/15
          bg-cyan-300/[0.04]
          p-4
        "
      >
        <div className="min-w-0">
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <Building2
              className="text-cyan-300"
              size={17}
            />

            <h3
              className="
                truncate
                text-lg
                font-semibold
                text-white
              "
            >
              {data.warehouse_label}
            </h3>
          </div>

          <p
            className="
              mt-1.5
              text-xs
              text-slate-400
            "
          >
            {data.document_date}
          </p>
        </div>

        <span
          className="
            shrink-0
            rounded-full
            border
            border-emerald-300/20
            bg-emerald-300/[0.08]
            px-2.5
            py-1
            text-xs
            text-emerald-300
          "
        >
          {data.iv_number}
        </span>
      </div>

      <div
        className="
          flex
          items-center
          justify-between
          border-b
          border-slate-700/50
          px-4
          py-3
        "
      >
        <span
          className="
            text-xs
            font-medium
            text-slate-400
          "
        >
          รายการสินค้า
        </span>

        <span
          className="
            text-xs
            text-cyan-300
          "
        >
          {data.items.length} รายการ
        </span>
      </div>

      <div
        className="
          divide-y
          divide-slate-800
          px-3
          py-2
        "
      >
        {data.items.map((item) => (
          <div
            key={`${data.iv_number}-${item.row_number}`}
            className="
              flex
              items-start
              justify-between
              gap-3
              px-1
              py-2.5
            "
          >
            <div className="min-w-0">
              <p
                className="
                  text-sm
                  leading-5
                  text-slate-200
                "
              >
                {item.product_name}
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                {item.product_code}
              </p>
            </div>

            <strong
              className="
                shrink-0
                text-base
                font-semibold
                text-cyan-200
              "
            >
              {
                formatNumber(
                  item.quantity,
                )
              }
            </strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function RealtimeCard({
  result,
  onNextProcess,
}: {
  result:
    ExpressSummaryResult | null;
  onNextProcess: () => void;
}) {
  const [
    copied,
    setCopied,
  ] = useState(
    false,
  );

  const [
    copyCompleted,
    setCopyCompleted,
  ] = useState(
    false,
  );

  const [
    copyPartIndex,
    setCopyPartIndex,
  ] = useState(
    0,
  );

  const lineMessages =
    result
      ? buildLineMessages(
          result,
        )
      : [];

  const currentLineMessage =
    lineMessages[
      copyPartIndex
    ] ?? "";

  useEffect(() => {
    setCopyPartIndex(
      0,
    );

    setCopied(
      false,
    );

    setCopyCompleted(
      false,
    );
  }, [result]);

  const copyForLine = async () => {
    if (
      !result ||
      !currentLineMessage
    ) {
      return;
    }

    await copyText(
      currentLineMessage,
    );

    setCopied(
      true,
    );

    setCopyCompleted(
      true,
    );

    window.setTimeout(() => {
      setCopied(
        false,
      );

      if (
        lineMessages.length > 1
      ) {
        setCopyPartIndex(
          (current) => (
            (
              current + 1
            ) %
            lineMessages.length
          ),
        );
      }
    }, 1800);
  };

  return (
    <aside
      className="
        flex
        h-full
        min-w-0
        min-h-0
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-violet-300/20
        bg-[#080f1d]
      "
    >
      <div
        className="
          border-b
          border-violet-300/15
          bg-violet-300/[0.06]
          p-5
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-3
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                border
                border-violet-300/25
                bg-violet-300/10
                text-violet-300
              "
            >
              <Activity size={18} />
            </div>

            <div>
              <h3
                className="
                  text-base
                  font-semibold
                  text-white
                "
              >
                Realtime Summary
              </h3>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-400
                "
              >
                EXPRESS MONITOR
              </p>
            </div>
          </div>

          <span
            className="
              h-2.5
              w-2.5
              rounded-full
              bg-emerald-300
              shadow-[0_0_12px_rgba(110,231,183,0.8)]
            "
          />
        </div>

        <div
          className="
            mt-5
            flex
            items-center
            justify-between
            gap-4
            rounded-xl
            border
            border-emerald-300/20
            bg-emerald-300/[0.07]
            px-4
            py-3
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
              text-emerald-300
            "
          >
            <Boxes size={17} />

            <span className="text-sm">
              จำนวนทั้งหมด
            </span>
          </div>

          <strong
            className="
              text-2xl
              font-semibold
              text-emerald-200
            "
          >
            {
              formatNumber(
                result?.total_quantity ??
                  0,
              )
            }
          </strong>
        </div>
      </div>

      <div
        className="
          flex
          items-center
          justify-between
          px-5
          py-4
        "
      >
        <p
          className="
            text-sm
            font-medium
            text-slate-300
          "
        >
          รายการสินค้าทั้งหมด
        </p>

        <span
          className="
            rounded-full
            border
            border-violet-300/20
            px-2.5
            py-1
            text-xs
            text-violet-300
          "
        >
          {result?.products.length ?? 0}
          {" "}ITEMS
        </span>
      </div>

      <div
        className="
          min-h-0
          flex-1
          overflow-y-auto
          px-4
          pb-4
        "
      >
        {!result ? (
          <div
            className="
              flex
              h-full
              flex-col
              items-center
              justify-center
              text-center
              text-slate-600
            "
          >
            <FileSpreadsheet
              size={32}
            />

            <p
              className="
                mt-3
                max-w-52
                text-xs
                leading-5
              "
            >
              เลือกไฟล์ CSV และกดประมวลผล
              เพื่อแสดงรายการสินค้า
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {result.products.map((product) => (
              <div
                key={
                  product.product_code ||
                  product.product_name
                }
                className="
                  flex
                  items-start
                  justify-between
                  gap-3
                  rounded-xl
                  border
                  border-slate-700/50
                  bg-slate-800/25
                  px-3
                  py-3
                "
              >
                <div className="min-w-0">
                  <p
                    className="
                      line-clamp-2
                      text-sm
                      leading-6
                      text-slate-200
                    "
                  >
                    {product.product_name}
                  </p>

                </div>

                <strong
                  className="
                    shrink-0
                    text-base
                    font-semibold
                    text-emerald-300
                  "
                >
                  {
                    formatNumber(
                      product.quantity,
                    )
                  }
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="
          shrink-0
          border-t
          border-slate-700/60
          p-4
        "
      >
        {result && (
          <div
            className="
              mb-3
              flex
              items-center
              justify-between
              gap-3
              text-xs
              text-slate-500
            "
          >
            <span>
              {
                lineMessages.length > 1
                  ? `ข้อความ ${copyPartIndex + 1}/${lineMessages.length}`
                  : "ข้อความ LINE"
              }
            </span>

            <span
              className={
                currentLineMessage.length >
                lineMessageLimit
                  ? "text-red-300"
                  : "text-emerald-300"
              }
            >
              {
                formatNumber(
                  currentLineMessage.length,
                )
              }
              /10,000 ตัวอักษร
            </span>
          </div>
        )}

        <button
          type="button"
          disabled={!result}
          onClick={() => {
            void copyForLine();
          }}
          className="
            flex
            w-full
            items-center
            justify-center
            gap-2
            rounded-xl
            border
            border-emerald-300/30
            bg-emerald-300/10
            px-5
            py-3
            text-sm
            font-medium
            text-emerald-200
            transition
            hover:bg-emerald-300/16
            disabled:cursor-not-allowed
            disabled:opacity-35
          "
        >
          {copied ? (
            <Check size={18} />
          ) : (
            <Copy size={18} />
          )}

          {copied
            ? "คัดลอกแล้ว"
            : lineMessages.length > 1
              ? `คัดลอกส่ง LINE (${copyPartIndex + 1}/${lineMessages.length})`
              : "คัดลอกส่ง LINE"}
        </button>

        {copyCompleted && (
          <button
            type="button"
            onClick={onNextProcess}
            className="
              vp-next-process
              mt-3
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-sky-400/40
              bg-sky-500
              px-5
              py-3
              text-sm
              font-semibold
              text-white
              shadow-lg
              shadow-sky-500/20
              transition
              hover:-translate-y-0.5
              hover:bg-sky-600
            "
          >
            Next Process
            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}

interface LineProduct {
  productCode: string;
  productName: string;
  quantity: number;
}

const lineMessageLimit =
  10_000;

const lineMessageSafeLimit =
  9_800;

const lineSeparator =
  "--------------------------------";

const lineWarehouseOrder = [
  "มหาชัย",
  "สำโรง",
  "ร่มเกล้า",
  "ชลบุรี",
  "รังสิต",
  "โชคชัย",
  "เชียงใหม่",
  "เชียงใหม่ ( ลาว )",
  "นครสวรรค์",
  "ขอนแก่น",
  "ขอนแก่น ( ลาว )",
  "โคราช",
  "หาดใหญ่",
  "สุราษฎร์ธานี",
];

const lineProductOrder = [
  "01-0000-29",
  "01-0000-10",
  "01-0000-14",
  "01-0000-16",
  "01-0000-18",
  "01-0000-22",
  "01-0000-23",
  "01-0000-24",
  "01-0000-28",
  "01-0000-27",
  "01-0000-26",
  "01-0000-30",
  "01-0000-31",
  "01-0000-32",
  "01-0000-33",
  "01-0000-35",
  "01-0000-34",
  "01-0000-37",
  "01-0000-36",
];

const lineProductNames:
  Record<string, string> = {
    "01-0000-29":
      "มิลล์เค้ก",
    "01-0000-10":
      "เค้กไข่ชีส",
    "01-0000-14":
      "อัลมอนด์เค้ก",
    "01-0000-16":
      "โรลช็อกโกแลต",
    "01-0000-18":
      "มินิครีมเค้ก",
    "01-0000-22":
      "เค้กครีมไก่หยองน้ำสลัด",
    "01-0000-23":
      "ชิสึเค้ก",
    "01-0000-24":
      "บลูเบอร์รี่เค้ก",
    "01-0000-28":
      "เค้กสาหร่ายไก่หยอง",
    "01-0000-27":
      "เค้กช็อกโกแลตเฮเซลนัท",
    "01-0000-26":
      "ชิฟฟอนชีสเค้ก",
    "01-0000-30":
      "วาฟเฟิลครีมโคโคนัทมิลค์",
    "01-0000-31":
      "เค้กโรลนมชมพู",
    "01-0000-32":
      "วาฟเฟิลราสเบอร์รี่",
    "01-0000-33":
      "ขนมปังมอนสเตอร์บลูเบอร์รี่",
    "01-0000-35":
      "ขนมปังมอนสเตอร์เยลโล่พีช",
    "01-0000-34":
      "เค้กโรลมัตจะ",
    "01-0000-37":
      "มินิเค้กกลิ่นกล้วยหอม",
    "01-0000-36":
      "ขนมปังมอนสเตอร์สตอเบอร์รี่",
  };

const thaiCurrentDateFormatter =
  new Intl.DateTimeFormat(
    "th-TH-u-ca-buddhist",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

function buildLineMessages(
  result: ExpressSummaryResult,
): string[] {
  const warehouseProducts =
    new Map<
      string,
      Map<string, LineProduct>
    >();

  for (const invoice of result.invoices) {
    const warehouseName =
      getLineWarehouseName(
        invoice.warehouse,
        invoice.warehouse_sequence,
      );

    const products =
      warehouseProducts.get(
        warehouseName,
      ) ?? new Map<
        string,
        LineProduct
      >();

    for (const item of invoice.items) {
      const key =
        item.product_code ||
        item.product_name;

      const current =
        products.get(
          key,
        );

      if (current) {
        current.quantity +=
          item.quantity;
      } else {
        products.set(
          key,
          {
            productCode:
              item.product_code,
            productName:
              item.product_name,
            quantity:
              item.quantity,
          },
        );
      }
    }

    warehouseProducts.set(
      warehouseName,
      products,
    );
  }

  const sections = [
    `สรุปยอดเปิดบิลประจำวันที่ ${thaiCurrentDateFormatter.format(new Date())}`,
  ];

  for (
    const warehouseName
    of lineWarehouseOrder
  ) {
    const products =
      warehouseProducts.get(
        warehouseName,
      );

    if (
      !products ||
      products.size === 0
    ) {
      continue;
    }

    sections.push(
      buildWarehouseLineSection(
        warehouseName,
        [...products.values()],
      ),
    );
  }

  const totalProducts:
    LineProduct[] =
    result.products.map(
      (product) => ({
        productCode:
          product.product_code,
        productName:
          product.product_name,
        quantity:
          product.quantity,
      }),
    );

  sections.push(
    [
      "ยอดรวมทั้งหมด",
      "",
      lineSeparator,
      ...buildLineProductRows(
        totalProducts,
      ),
      lineSeparator,
    ].join("\n"),
  );

  return splitLineSections(
    sections,
  );
}

function getLineWarehouseName(
  warehouse: string,
  sequence: number,
): string {
  if (
    warehouse === "เชียงใหม่" &&
    sequence === 2
  ) {
    return "เชียงใหม่ ( ลาว )";
  }

  if (
    warehouse === "ขอนแก่น" &&
    sequence === 3
  ) {
    return "ขอนแก่น ( ลาว )";
  }

  return warehouse;
}

function buildWarehouseLineSection(
  warehouseName: string,
  products: LineProduct[],
): string {
  return [
    warehouseName,
    ...buildLineProductRows(
      products,
    ),
    "",
    lineSeparator,
  ].join("\n");
}

function buildLineProductRows(
  products: LineProduct[],
): string[] {
  const orderedProducts =
    [...products].sort(
      (left, right) => {
        const leftIndex =
          lineProductOrder.indexOf(
            left.productCode,
          );

        const rightIndex =
          lineProductOrder.indexOf(
            right.productCode,
          );

        const safeLeft =
          leftIndex === -1
            ? Number.MAX_SAFE_INTEGER
            : leftIndex;

        const safeRight =
          rightIndex === -1
            ? Number.MAX_SAFE_INTEGER
            : rightIndex;

        return safeLeft - safeRight;
      },
    );

  return orderedProducts.map(
    (product) => (
      `• ${getLineProductName(product)} : ${formatNumber(product.quantity)}`
    ),
  );
}

function getLineProductName(
  product: LineProduct,
): string {
  const configuredName =
    lineProductNames[
      product.productCode
    ];

  if (configuredName) {
    return configuredName;
  }

  return product.productName
    .replace(
      /^ยูมิยูมิ\s*/,
      "",
    )
    .replace(
      /\s+\d+\s*กรัม\s*$/,
      "",
    )
    .trim();
}

function splitLineSections(
  sections: string[],
): string[] {
  const chunks: string[] = [];
  let currentChunk = "";

  const safeSections =
    sections.flatMap(
      (section) => (
        splitOversizedLineSection(
          section,
        )
      ),
    );

  for (const section of safeSections) {
    const candidate =
      currentChunk
        ? `${currentChunk}\n\n${section}`
        : section;

    if (
      candidate.length <=
      lineMessageSafeLimit
    ) {
      currentChunk = candidate;
      continue;
    }

    if (currentChunk) {
      chunks.push(
        currentChunk,
      );
    }

    currentChunk = section;
  }

  if (currentChunk) {
    chunks.push(
      currentChunk,
    );
  }

  if (chunks.length <= 1) {
    return chunks;
  }

  return chunks.map(
    (chunk, index) => (
      `ข้อความที่ ${index + 1}/${chunks.length}\n${chunk}`
    ),
  );
}

function splitOversizedLineSection(
  section: string,
): string[] {
  if (
    section.length <=
    lineMessageSafeLimit
  ) {
    return [
      section,
    ];
  }

  const parts: string[] = [];
  let currentPart = "";

  for (const sourceLine of section.split("\n")) {
    const lineParts =
      sourceLine.length >
      lineMessageSafeLimit
        ? splitLongLine(
            sourceLine,
          )
        : [
            sourceLine,
          ];

    for (const line of lineParts) {
      const candidate =
        currentPart
          ? `${currentPart}\n${line}`
          : line;

      if (
        candidate.length <=
        lineMessageSafeLimit
      ) {
        currentPart = candidate;
        continue;
      }

      if (currentPart) {
        parts.push(
          currentPart,
        );
      }

      currentPart = line;
    }
  }

  if (currentPart) {
    parts.push(
      currentPart,
    );
  }

  return parts;
}

function splitLongLine(
  value: string,
): string[] {
  const parts: string[] = [];

  for (
    let index = 0;
    index < value.length;
    index += lineMessageSafeLimit
  ) {
    parts.push(
      value.slice(
        index,
        index + lineMessageSafeLimit,
      ),
    );
  }

  return parts;
}

async function copyText(
  value: string,
): Promise<void> {
  if (
    navigator.clipboard?.writeText
  ) {
    try {
      await navigator.clipboard
        .writeText(
          value,
        );

      return;
    } catch {
      // ใช้วิธีสำรองด้านล่างเมื่อ WebView
      // ไม่อนุญาต Clipboard API
    }
  }

  const textarea =
    document.createElement(
      "textarea",
    );

  textarea.value = value;
  textarea.style.position =
    "fixed";
  textarea.style.opacity =
    "0";

  document.body.appendChild(
    textarea,
  );

  textarea.select();
  document.execCommand(
    "copy",
  );

  textarea.remove();
}

const numberFormatter =
  new Intl.NumberFormat(
    "th-TH",
    {
      maximumFractionDigits: 2,
    },
  );

function formatNumber(
  value: number,
): string {
  return numberFormatter.format(
    value,
  );
}

function getErrorMessage(
  reason: unknown,
): string {
  if (
    reason instanceof Error
  ) {
    return reason.message;
  }

  if (
    typeof reason === "string"
  ) {
    return reason;
  }

  return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
}
