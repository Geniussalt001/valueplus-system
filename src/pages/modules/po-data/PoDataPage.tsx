import {
  useState,
  type ReactNode,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  FileArchive,
  FolderArchive,
  ShieldCheck,
  Truck,
} from "lucide-react";

import type {
  AppUser,
} from "../../../auth/auth.types";

import {
  PoSevenArchivePage,
} from "./PoSevenArchivePage";

import {
  ReceivablesArchivePage,
} from "./ReceivablesArchivePage";

interface PoDataPageProps {
  currentUser: AppUser;
  onBack: () => void;
}

type ArchiveSection =
  | "po-seven"
  | "receivables"
  | null;

export function PoDataPage({
  currentUser,
  onBack,
}: PoDataPageProps) {
  const [
    selectedSection,
    setSelectedSection,
  ] = useState<ArchiveSection>(
    null,
  );

  if (
    selectedSection ===
    "po-seven"
  ) {
    return (
      <PoSevenArchivePage
        currentUser={currentUser}
        onBack={() => {
          setSelectedSection(
            null,
          );
        }}
      />
    );
  }

  if (
    selectedSection ===
    "receivables"
  ) {
    return (
      <ReceivablesArchivePage
        onBack={() => {
          setSelectedSection(
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
              hover:text-cyan-700
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
              text-cyan-700
            "
          >
            DOCUMENT ARCHIVE CENTER
          </p>

          <h2
            className="
              mt-2
              text-3xl
              font-semibold
              text-slate-900
            "
          >
            ศูนย์แฟ้มบันทึกข้อมูล
          </h2>

          <p
            className="
              mt-3
              max-w-3xl
              text-sm
              leading-6
              text-slate-500
            "
          >
            เลือกแฟ้มงานที่ต้องการค้นหา
            เอกสารแต่ละประเภทจะแยกพื้นที่จัดเก็บและขั้นตอนทำงานอย่างชัดเจน
            เพื่อให้สำนักงานใหญ่ใช้งานได้สะดวก
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
            border-cyan-300
            bg-cyan-50
            text-cyan-700
            shadow-sm
          "
        >
          <FolderArchive
            size={23}
          />
        </div>
      </header>

      <section
        className="
          mt-8
          grid
          gap-5
          lg:grid-cols-2
        "
      >
        <ArchiveFolderCard
          title="แฟ้มข้อมูล PO Seven"
          subtitle="SEVEN PO ARCHIVE"
          description="รวมเอกสาร PO ที่ระบบแยกและเปลี่ยนชื่อแล้ว พร้อมค้นหา Preview และเปิดไฟล์จาก Google Drive"
          icon={
            <FileArchive
              size={25}
            />
          }
          accent="cyan"
          status="พร้อมใช้งาน"
          features={[
            "บันทึกอัตโนมัติหลังแยก PDF",
            "ค้นหาด้วยเลข PO คลัง หรือวันที่",
            "เปิด Preview และ Google Drive",
          ]}
          onClick={() => {
            setSelectedSection(
              "po-seven",
            );
          }}
        />

        <ArchiveFolderCard
          title="แฟ้มข้อมูลลูกหนี้–ค่าขนส่ง"
          subtitle="RECEIVABLES & FREIGHT"
          description="ค้นหาแฟ้มรายปีและรายเดือน แก้ไขข้อมูลในตาราง และ Export เป็น Excel สำหรับสำนักงานใหญ่"
          icon={
            <Truck
              size={25}
            />
          }
          accent="amber"
          status="พร้อมใช้งาน"
          features={[
            "แยกแฟ้มตามปีและเดือน",
            "ค้นหาและแก้ไขข้อมูลในตาราง",
            "เปิด Google Sheet และ Export Excel",
          ]}
          onClick={() => {
            setSelectedSection(
              "receivables",
            );
          }}
        />
      </section>

      <section
        className="
          mt-6
          flex
          flex-col
          gap-4
          rounded-2xl
          border
          border-slate-200
          bg-white/80
          p-5
          shadow-sm
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div
          className="
            flex
            items-start
            gap-3
          "
        >
          <div
            className="
              mt-0.5
              rounded-lg
              bg-emerald-50
              p-2
              text-emerald-600
            "
          >
            <ShieldCheck
              size={18}
            />
          </div>

          <div>
            <p
              className="
                text-sm
                font-semibold
                text-slate-800
              "
            >
              พื้นที่เอกสารส่วนกลาง
            </p>
            <p
              className="
                mt-1
                text-xs
                leading-5
                text-slate-500
              "
            >
              แฟ้มแต่ละประเภทแยกข้อมูลออกจากกัน
              ลดความสับสนและป้องกันการเลือกเอกสารผิดหมวด
            </p>
          </div>
        </div>

        <p
          className="
            text-xs
            text-slate-500
          "
        >
          ผู้ใช้งาน:{" "}
          <span
            className="
              font-semibold
              text-cyan-700
            "
          >
            {currentUser.displayName}
          </span>
        </p>
      </section>
    </div>
  );
}

interface ArchiveFolderCardProps {
  title: string;
  subtitle: string;
  description: string;
  icon: ReactNode;
  accent:
    | "cyan"
    | "amber";
  status: string;
  features: string[];
  onClick: () => void;
}

const accentStyles = {
  cyan: {
    border:
      "border-cyan-200 hover:border-cyan-400",
    icon:
      "border-cyan-200 bg-cyan-50 text-cyan-700",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    glow:
      "from-cyan-400/10 via-blue-300/5 to-transparent",
    button:
      "bg-[#063b59] text-white group-hover:bg-[#075071]",
    dot:
      "bg-emerald-500 shadow-emerald-400/60",
  },
  amber: {
    border:
      "border-amber-200 hover:border-amber-400",
    icon:
      "border-amber-200 bg-amber-50 text-amber-700",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700",
    glow:
      "from-amber-300/10 via-orange-200/5 to-transparent",
    button:
      "bg-amber-500 text-white group-hover:bg-amber-600",
    dot:
      "bg-amber-500 shadow-amber-400/60",
  },
};

function ArchiveFolderCard({
  title,
  subtitle,
  description,
  icon,
  accent,
  status,
  features,
  onClick,
}: ArchiveFolderCardProps) {
  const styles =
    accentStyles[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group
        relative
        min-h-[340px]
        overflow-hidden
        rounded-3xl
        border
        bg-white
        p-7
        text-left
        shadow-[0_18px_45px_rgba(15,23,42,0.08)]
        transition
        duration-300
        hover:-translate-y-1
        hover:shadow-[0_24px_55px_rgba(8,145,178,0.14)]
        ${styles.border}
      `}
    >
      <div
        className={`
          pointer-events-none
          absolute
          inset-0
          bg-gradient-to-br
          opacity-80
          ${styles.glow}
        `}
      />

      <div
        className="
          relative
          flex
          h-full
          flex-col
        "
      >
        <div
          className="
            flex
            items-start
            justify-between
            gap-4
          "
        >
          <div
            className={`
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-2xl
              border
              ${styles.icon}
            `}
          >
            {icon}
          </div>

          <span
            className={`
              flex
              items-center
              gap-2
              rounded-full
              border
              px-3
              py-1.5
              text-[10px]
              font-semibold
              ${styles.badge}
            `}
          >
            <span
              className={`
                h-2
                w-2
                animate-pulse
                rounded-full
                shadow-[0_0_10px_currentColor]
                ${styles.dot}
              `}
            />
            {status}
          </span>
        </div>

        <p
          className="
            mt-8
            text-[10px]
            font-semibold
            tracking-[0.22em]
            text-cyan-700
          "
        >
          {subtitle}
        </p>

        <h3
          className="
            mt-2
            text-2xl
            font-semibold
            text-slate-900
          "
        >
          {title}
        </h3>

        <p
          className="
            mt-3
            text-sm
            leading-6
            text-slate-500
          "
        >
          {description}
        </p>

        <div
          className="
            mt-5
            space-y-2
          "
        >
          {features.map(
            (feature) => (
              <div
                key={feature}
                className="
                  flex
                  items-center
                  gap-2
                  text-xs
                  text-slate-600
                "
              >
                <span
                  className="
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-cyan-500
                  "
                />
                {feature}
              </div>
            ),
          )}
        </div>

        <div
          className="
            mt-auto
            flex
            items-center
            justify-between
            pt-7
          "
        >
          <span
            className="
              text-xs
              font-medium
              text-slate-500
            "
          >
            คลิกเพื่อเปิดแฟ้ม
          </span>

          <span
            className={`
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              shadow-md
              transition
              group-hover:translate-x-1
              ${styles.button}
            `}
          >
            <ArrowRight
              size={18}
            />
          </span>
        </div>
      </div>
    </button>
  );
}
