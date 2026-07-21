import {
  useState,
} from "react";

import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Gift,
  Truck,
} from "lucide-react";

import {
  ExpressSummaryPage,
} from "./express/ExpressSummaryPage";

interface DailySummaryPageProps {
  onBack: () => void;
}

type SummaryMode =
  | "express"
  | "doll";

export function DailySummaryPage({
  onBack,
}: DailySummaryPageProps) {
  const [
    selectedMode,
    setSelectedMode,
  ] = useState<
    SummaryMode | null
  >(
    null,
  );

  if (
    selectedMode ===
    "express"
  ) {
    return (
      <ExpressSummaryPage
        onBack={() => {
          setSelectedMode(
            null,
          );
        }}
      />
    );
  }

  return (
    <div
      className="
        mx-auto
        max-w-[1500px]
        px-6
        py-8
        lg:px-10
      "
    >
      <header
        className="
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
            className="
              mb-5
              flex
              items-center
              gap-2
              text-sm
              text-slate-500
              transition
              hover:text-cyan-300
            "
          >
            <ArrowLeft
              size={17}
            />

            กลับหน้าแดชบอร์ด
          </button>

          <p
            className="
              text-[10px]
              font-semibold
              tracking-[0.24em]
              text-violet-300
            "
          >
            DAILY SUMMARY
          </p>

          <h2
            className="
              mt-2
              text-3xl
              font-semibold
              text-white
            "
          >
            สรุปยอดรายวัน
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
            เลือกประเภทงานที่ต้องการสรุปยอด
          </p>
        </div>

        <div
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-xl
            border
            border-violet-300/20
            bg-violet-300/[0.07]
            text-violet-300
          "
        >
          <BarChart3 size={23} />
        </div>
      </header>

      <section
        className="
          mt-10
          grid
          gap-6
          lg:grid-cols-2
        "
      >
        <button
          type="button"
          onClick={() => {
            setSelectedMode(
              "express",
            );
          }}
          className={`
            group
            relative
            min-h-[280px]
            overflow-hidden
            rounded-3xl
            border
            p-8
            text-left
            transition
            duration-300
            hover:-translate-y-1
            hover:shadow-[0_24px_70px_rgba(34,211,238,0.12)]
            border-cyan-300/25
            bg-cyan-300/[0.07]
            hover:border-cyan-300/50
            hover:bg-cyan-300/[0.11]
          `}
        >
          <div
            className="
              absolute
              -right-16
              -top-16
              h-48
              w-48
              rounded-full
              bg-cyan-300/10
              blur-3xl
              transition
              group-hover:bg-cyan-300/20
            "
          />

          <div
            className="
              relative
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-2xl
              border
              border-cyan-300/30
              bg-cyan-300/10
              text-cyan-300
            "
          >
            <Truck size={30} />
          </div>

          <div className="relative mt-12">
            <p
              className="
                text-[10px]
                font-semibold
                tracking-[0.22em]
                text-cyan-300/70
              "
            >
              EXPRESS SUMMARY
            </p>

            <div
              className="
                mt-3
                flex
                items-center
                justify-between
                gap-4
              "
            >
              <h3
                className="
                  text-2xl
                  font-semibold
                  text-cyan-100
                "
              >
                สรุปยอด Express
              </h3>

            </div>

            <p
              className="
                mt-4
                text-sm
                leading-6
                text-slate-400
              "
            >
              เลือกเพื่อเข้าสู่กระบวนการสรุปยอด Express
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedMode(
              "doll",
            );
          }}
          className={`
            group
            relative
            min-h-[280px]
            overflow-hidden
            rounded-3xl
            border
            p-8
            text-left
            transition
            duration-300
            hover:-translate-y-1
            hover:shadow-[0_24px_70px_rgba(244,114,182,0.12)]
            ${
              selectedMode ===
              "doll"
                ? "border-pink-300/70 bg-pink-300/[0.13]"
                : "border-pink-300/25 bg-pink-300/[0.07] hover:border-pink-300/50 hover:bg-pink-300/[0.11]"
            }
          `}
        >
          <div
            className="
              absolute
              -right-16
              -top-16
              h-48
              w-48
              rounded-full
              bg-pink-300/10
              blur-3xl
              transition
              group-hover:bg-pink-300/20
            "
          />

          <div
            className="
              relative
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-2xl
              border
              border-pink-300/30
              bg-pink-300/10
              text-pink-300
            "
          >
            <Gift size={30} />
          </div>

          <div className="relative mt-12">
            <p
              className="
                text-[10px]
                font-semibold
                tracking-[0.22em]
                text-pink-300/70
              "
            >
              DOLL SUMMARY
            </p>

            <div
              className="
                mt-3
                flex
                items-center
                justify-between
                gap-4
              "
            >
              <h3
                className="
                  text-2xl
                  font-semibold
                  text-pink-100
                "
              >
                สรุปยอดตุ๊กตา
              </h3>

              {selectedMode ===
                "doll" && (
                <CheckCircle2
                  className="text-pink-300"
                  size={24}
                />
              )}
            </div>

            <p
              className="
                mt-4
                text-sm
                leading-6
                text-slate-400
              "
            >
              เลือกเพื่อเข้าสู่กระบวนการสรุปยอดตุ๊กตา
            </p>
          </div>
        </button>
      </section>
    </div>
  );
}
