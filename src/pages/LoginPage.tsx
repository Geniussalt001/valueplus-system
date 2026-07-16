import { ChevronRight, ShieldCheck } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <main
      className="login-background relative flex min-h-screen items-center justify-end overflow-hidden bg-cover bg-center px-6 py-10 lg:px-20"
      style={{
        backgroundImage: "url('/images/login-background.png')",
      }}
    >
      <div className="tron-grid pointer-events-none absolute inset-0 opacity-15" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#020812]/10 to-[#020812]/80" />

      <div className="energy-orb energy-orb-one" />
      <div className="energy-orb energy-orb-two" />

      <section className="login-card relative z-10 w-full max-w-[470px] overflow-hidden p-8 backdrop-blur-xl sm:p-10">
        <span className="energy-particle particle-one" />
        <span className="energy-particle particle-two" />
        <span className="energy-particle particle-three" />

        <div className="relative z-10">
          <BrandLogo size="medium" />

          <div className="mt-8 h-px bg-gradient-to-r from-cyan-300/70 via-cyan-300/20 to-transparent" />

          <div className="mt-8">
            <div className="flex items-center gap-2 text-cyan-300">
              <ShieldCheck size={18} />

              <span className="text-xs font-semibold tracking-[0.18em]">
                INTERNAL ACCESS
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-semibold leading-relaxed text-white">
              ระบบบริหารงาน
              <br />
              ภายในองค์กร
            </h1>

            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
              ศูนย์กลางสำหรับจัดการ ประมวลผล และติดตามเอกสารของ
              ValuePlus Retail
            </p>
          </div>

          <button
            type="button"
            onClick={onLogin}
            className="login-button group mt-9 flex w-full items-center justify-between px-6 py-4 text-left"
          >
            <span>
              <span className="block text-base font-semibold text-white">
                เข้าสู่ระบบ
              </span>

              <span className="mt-1 block text-[11px] tracking-[0.18em] text-cyan-300">
                ENTER VALUEPLUS SYSTEM
              </span>
            </span>

            <ChevronRight
              size={23}
              className="text-cyan-300 transition-transform group-hover:translate-x-1"
            />
          </button>

          <div className="mt-8 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              VALUEPLUS RETAIL CO., LTD.
            </span>

            <span className="flex items-center gap-2 text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7]" />
              READY
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}