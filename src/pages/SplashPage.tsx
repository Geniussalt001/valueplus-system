import {
  BrandLogo,
} from "../components/BrandLogo";

export function SplashPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020812]">
      <div className="tron-grid pointer-events-none absolute inset-0 opacity-20" />

      <div className="splash-aura absolute h-[460px] w-[460px] rounded-full bg-cyan-400/10 blur-[110px]" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="splash-logo-container flex h-44 w-80 items-center justify-center">
          <BrandLogo
            size="large"
            className="animate-[pulse_2.2s_ease-in-out_infinite]"
          />
        </div>

        <p className="mt-7 text-xs tracking-[0.42em] text-cyan-300">
          VALUEPLUS SYSTEM
        </p>

        <div className="mt-9 flex items-center gap-3">
          <span className="loading-dot loading-dot-one" />
          <span className="loading-dot loading-dot-two" />
          <span className="loading-dot loading-dot-three" />
        </div>

        <p className="mt-5 text-[10px] tracking-[0.22em] text-slate-500">
          INITIALIZING WORKSPACE
        </p>
      </div>
    </main>
  );
}