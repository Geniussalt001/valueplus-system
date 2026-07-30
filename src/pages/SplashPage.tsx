import {
  BrandLogo,
} from "../components/BrandLogo";

export function SplashPage() {
  return (
    <main className="splash-hybrid relative flex min-h-screen items-center justify-end overflow-hidden bg-cover bg-center px-6 py-10 lg:px-20">
      <div
        className="splash-hybrid-vignette pointer-events-none absolute inset-0"
        aria-hidden="true"
      />

      <div
        className="absolute right-[8%] h-[460px] w-[460px] rounded-full bg-red-500/10 blur-[110px]"
        aria-hidden="true"
      />

      <div className="splash-hybrid-panel relative z-10 flex w-full max-w-[500px] flex-col items-center rounded-[28px] px-8 py-10 text-center backdrop-blur-2xl sm:px-12 sm:py-12">
        <p className="text-[10px] font-semibold tracking-[0.34em] text-red-300">
          WELCOME TO
        </p>

        <div className="splash-logo-container mt-6 flex h-40 w-full max-w-80 items-center justify-center">
          <BrandLogo
            size="large"
            className="splash-hybrid-logo"
          />
        </div>

        <p className="mt-7 text-xs font-semibold tracking-[0.38em] text-white">
          VALUEPLUS SYSTEM
        </p>

        <div className="mt-9 flex items-center gap-3.5">
          <span className="loading-dot loading-dot-one" />
          <span className="loading-dot loading-dot-two" />
          <span className="loading-dot loading-dot-three" />
        </div>

        <p className="mt-5 text-[10px] tracking-[0.22em] text-slate-400">
          INITIALIZING WORKSPACE
        </p>
      </div>
    </main>
  );
}
