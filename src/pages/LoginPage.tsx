import {
  useState,
} from "react";

import {
  ArrowRight,
  ShieldCheck,
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

interface LoginPageProps {
  onLogin: (
    user: AppUser,
  ) => void;
}

export function LoginPage({
  onLogin,
}: LoginPageProps) {
  const [
    userCode,
    setUserCode,
  ] = useState("OFFICE");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const submitLogin = async () => {
    if (!password || loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const session =
        await authService.login({
          userCode,
          password,
        });

      onLogin(session.user);
    } catch (requestError) {
      setError(
        getLoginErrorMessage(
          requestError,
        ),
      );
    } finally {
      setLoading(false);
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
      <section className="login-red-card relative z-10 w-full max-w-[480px] overflow-hidden p-8 backdrop-blur-xl sm:p-10">
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
              เลือกหน่วยงานและกรอกรหัสผ่าน
              เพื่อเข้าสู่ระบบบริหารงานภายใน
            </p>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3">
            {[
              {
                code: "OFFICE",
                label: "สำนักงาน",
              },
              {
                code: "HEADOFFICE",
                label: "สำนักงานใหญ่",
              },
            ].map((account) => (
              <button
                key={account.code}
                type="button"
                disabled={loading}
                onClick={() => {
                  setUserCode(
                    account.code,
                  );
                  setError("");
                }}
                className={[
                  "rounded-xl border px-4 py-3 text-left transition",
                  userCode === account.code
                    ? "border-cyan-500 bg-cyan-50 text-cyan-800 shadow-sm"
                    : "border-slate-200 bg-white/80 text-slate-600 hover:border-cyan-300",
                ].join(" ")}
              >
                <span className="block text-sm font-semibold">
                  {account.label}
                </span>
                <span className="mt-1 block text-[10px] tracking-[0.14em] opacity-65">
                  {account.code}
                </span>
              </button>
            ))}
          </div>

          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitLogin();
            }}
          >
            <label
              htmlFor="valueplus-password"
              className="text-xs font-medium text-slate-600"
            >
              รหัสผ่าน
            </label>

            <input
              id="valueplus-password"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              disabled={loading}
              onChange={(event) => {
                setPassword(
                  event.target.value,
                );
                setError("");
              }}
              placeholder="กรอกรหัสผ่าน"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 disabled:opacity-60"
            />

            {error && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !password
              }
              className="login-red-button group mt-5 flex w-full items-center justify-between px-6 py-4 text-left disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>
                <span className="block text-base font-semibold">
                  {loading
                    ? "กำลังตรวจสอบ..."
                    : "เข้าสู่ระบบ"}
                </span>
                <span className="mt-1 block text-[11px] tracking-[0.18em] text-white/70">
                  {userCode}
                </span>
              </span>

              <ArrowRight
                size={22}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>
          </form>

          <div className="mt-7 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              VALUEPLUS RETAIL CO., LTD.
            </span>
            <span className="flex items-center gap-2 font-medium text-emerald-700">
              <span
                className="status-light status-online"
                aria-hidden="true"
              />
              SECURE
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function getLoginErrorMessage(
  error: unknown,
): string {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  if (
    message.startsWith(
      "ACCOUNT_LOCKED:",
    )
  ) {
    const seconds =
      message.split(":")[1] ||
      "20";

    return `กรอกรหัสผิดเกินกำหนด กรุณารอ ${seconds} วินาที`;
  }

  if (
    message.startsWith(
      "INVALID_PASSWORD:",
    )
  ) {
    const remaining =
      message.split(":")[1] ||
      "0";

    return `รหัสผ่านไม่ถูกต้อง เหลือโอกาสอีก ${remaining} ครั้ง`;
  }

  if (
    message ===
    "SESSION_REQUIRED"
  ) {
    return "กรุณาเข้าสู่ระบบใหม่";
  }

  return message;
}
