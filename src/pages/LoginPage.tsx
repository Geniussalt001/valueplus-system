import {
  useEffect,
  useState,
} from "react";

import {
  ArrowRight,
  Building2,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  Warehouse,
  Wifi,
} from "lucide-react";

import type {
  AppUser,
} from "../auth/auth.types";

import {
  authService,
} from "../auth/authService";

import {
  BrandLogo,
} from "../components/BrandLogo";

import {
  activateAppsScript,
  hasAppsScriptConnection,
} from "../services/appsScriptClient";

interface LoginPageProps {
  onLogin: (
    user: AppUser,
  ) => void;
}

const accounts = [
  {
    code: "OFFICE",
    label: "สำนักงาน",
    englishLabel: "OFFICE",
    description:
      "สำหรับจัดการและประมวลผลงานประจำวัน",
    icon: Warehouse,
  },
  {
    code: "HEADOFFICE",
    label: "สำนักงานใหญ่",
    englishLabel: "HEAD OFFICE",
    description:
      "สำหรับค้นหา ตรวจสอบ และใช้งานแฟ้มส่วนกลาง",
    icon: Building2,
  },
] as const;

export function LoginPage({
  onLogin,
}: LoginPageProps) {
  const [
    connectionState,
    setConnectionState,
  ] = useState<
    | "checking"
    | "required"
    | "activating"
    | "ready"
  >("checking");

  const [
    activationCode,
    setActivationCode,
  ] = useState("");

  const [
    loadingCode,
    setLoadingCode,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let active = true;

    async function checkConnection() {
      try {
        const connected =
          await hasAppsScriptConnection();

        if (active) {
          setConnectionState(
            connected
              ? "ready"
              : "required",
          );
        }
      } catch (requestError) {
        if (active) {
          setConnectionState(
            "required",
          );
          setError(
            requestError instanceof
              Error
              ? requestError.message
              : String(
                  requestError,
                ),
          );
        }
      }
    }

    void checkConnection();

    return () => {
      active = false;
    };
  }, []);

  const activateSystem =
    async () => {
      if (
        connectionState ===
          "activating" ||
        !activationCode.trim()
      ) {
        return;
      }

      setConnectionState(
        "activating",
      );
      setError("");

      try {
        await activateAppsScript(
          activationCode,
        );

        setActivationCode("");
        setConnectionState(
          "ready",
        );
      } catch (requestError) {
        setConnectionState(
          "required",
        );
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : String(
                requestError,
              ),
        );
      }
    };

  const selectAccount = async (
    userCode: string,
  ) => {
    if (loadingCode) {
      return;
    }

    setLoadingCode(userCode);
    setError("");

    try {
      const session =
        await authService.select(
          userCode,
        );

      onLogin(session.user);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : String(requestError);

      if (
        message ===
        "ACTIVATION_REQUIRED"
      ) {
        setConnectionState(
          "required",
        );
        setError(
          "สิทธิ์ของเครื่องหมดอายุ กรุณากรอกรหัสเปิดใช้งานอีกครั้ง",
        );
      } else {
        setError(message);
      }
    } finally {
      setLoadingCode("");
    }
  };

  return (
    <main
      className="login-red-white relative flex min-h-screen items-center justify-end overflow-hidden bg-cover px-6 py-10 lg:px-20"
      style={{
        backgroundImage:
          "url('/images/login-background-white-tron.webp')",
      }}
    >
      <section className="login-red-card relative z-10 w-full max-w-[500px] overflow-hidden p-8 backdrop-blur-xl sm:p-10">
        <div className="relative z-10">
          <BrandLogo size="medium" />

          <div className="mt-7 h-px bg-gradient-to-r from-cyan-500/80 via-blue-500/20 to-transparent" />

          <div className="mt-8">
            <div className="flex items-center gap-2 text-cyan-700">
              <ShieldCheck size={18} />
              <span className="text-xs font-semibold tracking-[0.18em]">
                VALUEPLUS SYSTEM
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold text-slate-900">
              ยินดีต้อนรับ
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              เลือกส่วนงาน Office หรือ Head Office
              เพื่อเข้าสู่ระบบได้ทันที
            </p>
          </div>

          {connectionState ===
            "checking" && (
            <div className="mt-8 flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-cyan-200 bg-white/85 px-6 text-center">
              <LoaderCircle
                size={30}
                className="animate-spin text-cyan-600"
              />
              <p className="mt-4 font-semibold text-slate-900">
                กำลังตรวจสอบการเชื่อมต่อ
              </p>
              <p className="mt-1 text-xs text-slate-500">
                กรุณารอสักครู่
              </p>
            </div>
          )}

          {(connectionState ===
            "required" ||
            connectionState ===
              "activating") && (
            <form
              className="mt-8 rounded-2xl border border-cyan-200 bg-white/90 p-5 shadow-sm"
              onSubmit={(event) => {
                event.preventDefault();
                void activateSystem();
              }}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                  <Wifi size={21} />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">
                    เชื่อมต่อระบบครั้งแรก
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    กรอกรหัสเปิดใช้งานสำหรับเครื่องนี้
                  </p>
                </div>
              </div>

              <label className="mt-5 block text-xs font-medium text-slate-600">
                รหัสเปิดใช้งาน
              </label>

              <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-4 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-100">
                <KeyRound
                  size={18}
                  className="text-cyan-700"
                />
                <input
                  autoFocus
                  value={
                    activationCode
                  }
                  disabled={
                    connectionState ===
                    "activating"
                  }
                  onChange={(
                    event,
                  ) => {
                    setActivationCode(
                      event.target
                        .value,
                    );
                    setError("");
                  }}
                  placeholder="กรอกรหัสที่ได้รับ"
                  className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-900 outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={
                  !activationCode.trim() ||
                  connectionState ===
                    "activating"
                }
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#063b59] text-sm font-semibold text-white shadow-md transition hover:bg-[#075071] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {connectionState ===
                "activating" ? (
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <ShieldCheck
                    size={18}
                  />
                )}
                เชื่อมต่อระบบ
              </button>
            </form>
          )}

          {connectionState ===
            "ready" && (
          <div className="mt-7 space-y-3">
            {accounts.map((account) => {
              const Icon =
                account.icon;

              const loading =
                loadingCode ===
                account.code;

              return (
                <button
                  key={account.code}
                  type="button"
                  disabled={Boolean(
                    loadingCode,
                  )}
                  onClick={() => {
                    void selectAccount(
                      account.code,
                    );
                  }}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-cyan-200 bg-white/90 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-500 hover:bg-cyan-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700">
                    <Icon size={22} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-slate-900">
                      {account.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-semibold tracking-[0.16em] text-cyan-700">
                      {account.englishLabel}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {account.description}
                    </span>
                  </span>

                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#063b59] text-white transition group-hover:translate-x-1 group-hover:bg-[#075071]">
                    <ArrowRight
                      size={18}
                      className={
                        loading
                          ? "animate-pulse"
                          : ""
                      }
                    />
                  </span>
                </button>
              );
            })}
          </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-7 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              VALUEPLUS RETAIL CO., LTD.
            </span>
            <span className="flex items-center gap-2 font-medium text-emerald-700">
              <span
                className="status-light status-online"
                aria-hidden="true"
              />
              READY
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
