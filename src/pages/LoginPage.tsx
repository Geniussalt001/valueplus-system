import {
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import {
  BrandLogo,
} from "../components/BrandLogo";

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({
  onLogin,
}: LoginPageProps) {
  return (
    <main
      className="login-red-white relative flex min-h-screen items-center justify-end overflow-hidden bg-cover px-6 py-10 lg:px-20"
      style={{
        backgroundImage:
          "url('/images/login-background-red-white.png')",
      }}
    >
      <section className="login-red-card relative z-10 w-full max-w-[480px] overflow-hidden p-8 backdrop-blur-xl sm:p-10">
        <div className="relative z-10">
          <BrandLogo size="medium" />

          <div className="mt-7 h-px bg-gradient-to-r from-red-600/70 via-red-500/20 to-transparent" />

          <div className="mt-8">
            <div className="flex items-center gap-2 text-red-700">
              <ShieldCheck size={18} />
              <span className="text-xs font-semibold tracking-[0.18em]">
                VALUEPLUS SYSTEM
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold text-slate-900">
              ยินดีต้อนรับ
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              ระบบบริหารงานภายในองค์กร
              ValuePlus Retail Co., Ltd.
            </p>
          </div>

          <button
            type="button"
            onClick={onLogin}
            className="login-red-button group mt-8 flex w-full items-center justify-between px-6 py-4 text-left"
          >
            <span>
              <span className="block text-base font-semibold">
                เข้าสู่ระบบ
              </span>
              <span className="mt-1 block text-[11px] tracking-[0.18em] text-red-100">
                ENTER VALUEPLUS SYSTEM
              </span>
            </span>

            <ArrowRight
              size={22}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>

          <div className="mt-7 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              VALUEPLUS RETAIL CO., LTD.
            </span>
            <span className="flex items-center gap-2 font-medium text-red-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_9px_#ef4444]" />
              READY
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
