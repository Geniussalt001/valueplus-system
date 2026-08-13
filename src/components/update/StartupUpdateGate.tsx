import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CheckCircle2,
  Download,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

import {
  BrandLogo,
} from "../BrandLogo";

import {
  checkForUpdate,
  getCurrentVersion,
  getOfflineUpdateDecision,
  installUpdate,
  rememberSuccessfulUpdateCheck,
  type UpdateInformation,
} from "../../services/updateService";

type StartupStatus =
  | "checking"
  | "available"
  | "downloading"
  | "installing"
  | "error";

interface StartupUpdateGateProps {
  onReady: () => void;
}

function getErrorMessage(error: unknown): string {
  const detail =
    error instanceof Error
      ? error.message
      : String(error);

  if (detail.includes("404")) {
    return "ยังไม่พบข้อมูล Release สำหรับตรวจสอบอัปเดต";
  }

  return "เชื่อมต่อระบบอัปเดตไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
}

export function StartupUpdateGate({
  onReady,
}: StartupUpdateGateProps) {
  const started = useRef(false);
  const [status, setStatus] =
    useState<StartupStatus>("checking");
  const [information, setInformation] =
    useState<UpdateInformation | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(
    "กำลังตรวจสอบเวอร์ชันล่าสุด...",
  );

  const checkUpdate = useCallback(async () => {
    setStatus("checking");
    setProgress(0);
    setMessage("กำลังตรวจสอบเวอร์ชันล่าสุด...");

    try {
      const result = await checkForUpdate();
      rememberSuccessfulUpdateCheck(
        result,
      );
      setInformation(result);

      if (!result.available) {
        onReady();
        return;
      }

      setStatus("available");
      setMessage(
        result.message ||
          `พบ ValuePlus System เวอร์ชัน ${result.nextVersion}`,
      );
    } catch (error) {
      try {
        const currentVersion =
          await getCurrentVersion();
        const offlineDecision =
          getOfflineUpdateDecision(
            currentVersion,
          );

        if (offlineDecision.allowed) {
          onReady();
          return;
        }
      } catch {
        // Keep the update screen locked when the installed version
        // or the last successful decision cannot be verified.
      }

      setStatus("error");
      setMessage(getErrorMessage(error));
    }
  }, [onReady]);

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;
    void checkUpdate();
  }, [checkUpdate]);

  const startUpdate = async () => {
    setStatus("downloading");
    setProgress(0);
    setMessage("กำลังดาวน์โหลดอัปเดต...");

    try {
      await installUpdate((nextProgress) => {
        setProgress(nextProgress);

        if (nextProgress >= 100) {
          setStatus("installing");
          setMessage("กำลังติดตั้งและเปิดโปรแกรมใหม่...");
        }
      });
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "ติดตั้งอัปเดตไม่สำเร็จ กรุณาลองใหม่",
      );
    }
  };

  const isBusy =
    status === "checking" ||
    status === "downloading" ||
    status === "installing";
  const isMandatory = information?.mandatory === true;

  return (
    <main className="startup-update-gate relative flex min-h-screen items-center justify-end overflow-hidden px-6 py-10 lg:px-20">
      <div
        className="startup-update-vignette pointer-events-none absolute inset-0"
        aria-hidden="true"
      />

      <section className="startup-update-card relative z-10 w-full max-w-[520px] rounded-[28px] px-8 py-9 sm:px-11">
        <div className="flex items-center justify-between gap-5">
          <BrandLogo size="medium" />

          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-blue-700">
            UPDATE CENTER
          </span>
        </div>

        <div className="mt-8 flex items-start gap-4">
          <div className="startup-update-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
            {status === "available" && isMandatory ? (
              <ShieldAlert size={24} />
            ) : status === "available" ? (
              <Download size={24} />
            ) : status === "error" ? (
              <TriangleAlert size={24} />
            ) : status === "installing" ? (
              <CheckCircle2 size={24} />
            ) : (
              <LoaderCircle size={24} className="animate-spin" />
            )}
          </div>

          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">
              {status === "checking" && "กำลังตรวจสอบเวอร์ชัน"}
              {status === "available" &&
                (isMandatory
                  ? "จำเป็นต้องอัปเดตก่อนใช้งาน"
                  : "มีเวอร์ชันใหม่พร้อมใช้งาน")}
              {status === "downloading" && "กำลังดาวน์โหลด"}
              {status === "installing" && "กำลังติดตั้งอัปเดต"}
              {status === "error" && "ตรวจสอบอัปเดตไม่สำเร็จ"}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {message}
            </p>
          </div>
        </div>

        {information?.available && (
          <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">เวอร์ชันปัจจุบัน</p>
              <p className="mt-1 font-bold text-slate-800">
                {information.currentVersion}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">เวอร์ชันใหม่</p>
              <p className="mt-1 font-bold text-blue-700">
                {information.nextVersion}
              </p>
            </div>
          </div>
        )}

        {(status === "downloading" || status === "installing") && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{status === "installing" ? "ติดตั้ง" : "ดาวน์โหลด"}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="startup-update-progress h-full rounded-full transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {status === "available" && (
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              className="startup-update-primary flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white"
              onClick={() => void startUpdate()}
            >
              <Download size={17} />
              อัปเดตตอนนี้
            </button>

            {!isMandatory && (
              <button
                type="button"
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={onReady}
              >
                ภายหลัง
              </button>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="mt-7">
            <button
              type="button"
              className="startup-update-primary flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white"
              onClick={() => void checkUpdate()}
            >
              <RefreshCw size={17} />
              ลองใหม่
            </button>
          </div>
        )}

        {isBusy && (
          <p className="mt-6 text-center text-[11px] text-slate-500">
            กรุณาอย่าปิดโปรแกรมระหว่างดำเนินการ
          </p>
        )}
      </section>
    </main>
  );
}
