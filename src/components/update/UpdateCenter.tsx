import {
  useEffect,
  useState,
} from "react";

import {
  CheckCircle2,
  Download,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";

import {
  checkForUpdate,
  getCurrentVersion,
  installUpdate,
} from "../../services/updateService";

type UpdateStatus =
  | "idle"
  | "checking"
  | "latest"
  | "available"
  | "downloading"
  | "installing"
  | "error";

export function UpdateCenter() {
  const [
    currentVersion,
    setCurrentVersion,
  ] = useState("...");

  const [
    nextVersion,
    setNextVersion,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState<UpdateStatus>(
    "idle",
  );

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    message,
    setMessage,
  ] = useState(
    "พร้อมตรวจสอบอัปเดต",
  );

  useEffect(() => {
    let mounted = true;

    void getCurrentVersion()
      .then((version) => {
        if (mounted) {
          setCurrentVersion(
            version,
          );
        }
      })
      .catch(() => {
        if (mounted) {
          setCurrentVersion(
            "1.0.0",
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const checkUpdate =
    async () => {
      setStatus("checking");
      setMessage(
        "กำลังตรวจสอบเวอร์ชัน...",
      );
      setProgress(0);

      try {
        const information =
          await checkForUpdate();

        setCurrentVersion(
          information.currentVersion,
        );

        if (
          information.available &&
          information.nextVersion
        ) {
          setNextVersion(
            information.nextVersion,
          );
          setStatus("available");
          setMessage(
            `พบเวอร์ชัน ${information.nextVersion}`,
          );
          return;
        }

        setNextVersion("");
        setStatus("latest");
        setMessage(
          "เป็นเวอร์ชันล่าสุดแล้ว",
        );
      } catch (error) {
        const detail =
          error instanceof Error
            ? error.message
            : String(error);

        setStatus("error");

        if (
          detail.includes("404") ||
          detail
            .toLowerCase()
            .includes("release")
        ) {
          setMessage(
            "ยังไม่มี Release สำหรับอัปเดต",
          );
        } else {
          setMessage(
            "ตรวจสอบอัปเดตไม่สำเร็จ",
          );
        }
      }
    };

  const startUpdate =
    async () => {
      setStatus("downloading");
      setProgress(0);
      setMessage(
        "กำลังดาวน์โหลดอัปเดต...",
      );

      try {
        await installUpdate(
          (nextProgress) => {
            setProgress(
              nextProgress,
            );

            if (
              nextProgress >= 100
            ) {
              setStatus(
                "installing",
              );
              setMessage(
                "กำลังติดตั้งและเริ่มระบบใหม่...",
              );
            }
          },
        );
      } catch (error) {
        const detail =
          error instanceof Error
            ? error.message
            : String(error);

        setStatus("error");
        setMessage(
          detail ||
            "ติดตั้งอัปเดตไม่สำเร็จ",
        );
      }
    };

  const isBusy =
    status === "checking" ||
    status === "downloading" ||
    status === "installing";

  const indicatorClass =
    status === "available"
      ? "bg-amber-300 shadow-[0_0_9px_#fcd34d]"
      : status === "error"
        ? "bg-red-400 shadow-[0_0_9px_#f87171]"
        : "bg-emerald-300 shadow-[0_0_9px_#6ee7b7]";

  return (
    <section className="rounded-xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.17em] text-cyan-300">
            UPDATE CENTER
          </p>

          <p className="mt-1.5 text-xs text-slate-300">
            VERSION{" "}
            <span className="font-semibold text-cyan-100">
              {currentVersion}
            </span>
          </p>
        </div>

        <span
          className={`mt-1 h-2 w-2 rounded-full ${indicatorClass}`}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        {status === "checking" ||
        status === "downloading" ||
        status === "installing" ? (
          <LoaderCircle
            size={14}
            className="shrink-0 animate-spin text-cyan-300"
          />
        ) : status === "available" ? (
          <Download
            size={14}
            className="shrink-0 text-amber-300"
          />
        ) : status === "error" ? (
          <TriangleAlert
            size={14}
            className="shrink-0 text-red-300"
          />
        ) : (
          <CheckCircle2
            size={14}
            className="shrink-0 text-emerald-300"
          />
        )}

        <p className="line-clamp-2 text-[10px] leading-4 text-slate-500">
          {message}
        </p>
      </div>

      {(status === "downloading" ||
        status === "installing") && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-300 transition-[width] duration-300"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <p className="mt-1.5 text-right text-[9px] text-cyan-300">
            {progress}%
          </p>
        </div>
      )}

      {status === "available" ? (
        <button
          type="button"
          onClick={() => {
            void startUpdate();
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300/25 bg-amber-300/[0.08] px-3 py-2 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-300/[0.14]"
        >
          <RotateCcw size={13} />
          อัปเดตเป็น {nextVersion}
        </button>
      ) : (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            void checkUpdate();
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-2 text-[10px] font-semibold text-cyan-200 transition hover:bg-cyan-300/[0.1] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {status === "checking" ? (
            <LoaderCircle
              size={13}
              className="animate-spin"
            />
          ) : (
            <RefreshCw size={13} />
          )}

          {status === "checking"
            ? "กำลังตรวจสอบ"
            : "ตรวจสอบอัปเดต"}
        </button>
      )}
    </section>
  );
}