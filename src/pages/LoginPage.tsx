import {
  useState,
} from "react";

import {
  ArrowRight,
  Building2,
  ShieldCheck,
  Warehouse,
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
    loadingCode,
    setLoadingCode,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

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
      setError(
        requestError instanceof Error
          ? requestError.message
          : String(requestError),
      );
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
