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
    status === "checking" ||
    status === "downloading" ||
    status === "installing"
      ? "status-processing"
      : status === "available"
        ? "status-waiting"
        : status === "error"
          ? "status-error"
          : status === "latest"
            ? "status-success"
            : "status-online";

  return (
    <section className="update-center-panel rounded-2xl border border-sky-200 bg-gradient-to-br from-white via-sky-50 to-violet-50 p-4 shadow-[0_12px_30px_rgba(56,86,146,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.17em] text-sky-700">
            UPDATE CENTER
          </p>

          <p className="mt-1.5 text-xs text-slate-600">
            VERSION{" "}
            <span className="font-bold text-violet-700">
              {currentVersion}
            </span>
          </p>
        </div>

        <span
          className={`status-light mt-1 ${indicatorClass}`}
          aria-label={message}
          title={message}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        {status === "checking" ||
        status === "downloading" ||
        status === "installing" ? (
          <LoaderCircle
            size={14}
            className="shrink-0 animate-spin text-sky-600"
          />
        ) : status === "available" ? (
          <Download
            size={14}
            className="shrink-0 text-amber-600"
          />
        ) : status === "error" ? (
          <TriangleAlert
            size={14}
            className="shrink-0 text-rose-600"
          />
        ) : (
          <CheckCircle2
            size={14}
            className="shrink-0 text-emerald-600"
          />
        )}

        <p className="line-clamp-2 text-[10px] font-medium leading-4 text-slate-600">
          {message}
        </p>
      </div>

      {(status === "downloading" ||
        status === "installing") && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-300 transition-[width] duration-300"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <p className="mt-1.5 text-right text-[9px] font-semibold text-sky-700">
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
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500 bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-2.5 text-[10px] font-bold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:from-violet-700 hover:to-fuchsia-600"
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
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-sky-600 bg-gradient-to-r from-sky-600 to-cyan-500 px-3 py-2.5 text-[10px] font-bold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:from-sky-700 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-45"
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
