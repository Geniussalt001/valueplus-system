import type { ReactNode } from "react";
import {
  ChevronRight,
  Home,
  LogOut,
  Server,
} from "lucide-react";

import { BrandLogo } from "../components/BrandLogo";
import { LiveClock } from "../components/LiveClock";
import { systemModules } from "../data/systemModules";
import type { WorkRoute } from "../types/app";

interface AppLayoutProps {
  children: ReactNode;
  currentRoute: WorkRoute;
  onNavigate: (route: WorkRoute) => void;
  onLogout: () => void;
}

export function AppLayout({
  children,
  currentRoute,
  onNavigate,
  onLogout,
}: AppLayoutProps) {
  const currentModule = systemModules.find(
    (module) => module.route === currentRoute,
  );

  const pageTitle =
    currentRoute === "dashboard"
      ? "ValuePlus Dashboard"
      : currentModule?.title ?? "ValuePlus System";

  return (
    <main className="dashboard min-h-screen bg-[#020812] text-white">
      <div className="tron-grid pointer-events-none fixed inset-0 opacity-[0.08]" />

      <aside className="dashboard-sidebar fixed bottom-0 left-0 top-0 z-30 hidden w-72 flex-col border-r border-cyan-300/10 bg-[#030d19]/95 p-6 backdrop-blur-xl lg:flex">
        <button
          type="button"
          onClick={() => onNavigate("dashboard")}
          className="text-left"
        >
          <BrandLogo size="medium" />
        </button>

        <div className="my-7 h-px bg-gradient-to-r from-cyan-300/40 to-transparent" />

        <p className="px-3 text-[10px] tracking-[0.22em] text-slate-600">
          MAIN NAVIGATION
        </p>

        <nav className="mt-4 space-y-1.5">
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className={`sidebar-item ${
              currentRoute === "dashboard"
                ? "sidebar-item-active"
                : ""
            }`}
          >
            <Home size={17} />
            <span>แดชบอร์ด</span>
            <ChevronRight size={14} className="ml-auto" />
          </button>

          <p className="px-3 pb-1 pt-5 text-[10px] tracking-[0.2em] text-slate-700">
            WORK MODULES
          </p>

          {systemModules.map((module) => {
            const Icon = module.icon;
            const isActive = currentRoute === module.route;

            return (
              <button
                key={module.route}
                type="button"
                onClick={() => onNavigate(module.route)}
                className={`sidebar-item ${
                  isActive ? "sidebar-item-active" : ""
                }`}
              >
                <Icon
                  size={17}
                  style={{
                    color: isActive ? module.color : undefined,
                  }}
                />

                <span className="truncate">{module.title}</span>

                {isActive && (
                  <span
                    className="ml-auto h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: module.color,
                      boxShadow: `0 0 8px ${module.color}`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto">
          <div className="rounded-xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4">
            <div className="flex items-center gap-3">
              <Server size={18} className="text-emerald-300" />

              <div>
                <p className="text-xs text-slate-300">
                  Local Service
                </p>

                <p className="mt-1 text-[10px] tracking-[0.15em] text-emerald-300">
                  CONNECTED
                </p>
              </div>
            </div>
          </div>

          <p className="mt-5 text-[10px] tracking-[0.15em] text-slate-700">
            VALUEPLUS SYSTEM · V1.0
          </p>
        </div>
      </aside>

      <section className="relative z-10 min-h-screen lg:ml-72">
        <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b border-cyan-300/10 bg-[#03101f]/85 px-6 backdrop-blur-xl lg:px-10">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-cyan-300">
              VALUEPLUS WORKSPACE
            </p>

            <h1 className="mt-1 text-lg font-semibold">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-5">
            <LiveClock />

            <button
              type="button"
              onClick={onLogout}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 text-slate-400 transition hover:border-red-400/50 hover:text-red-300"
              aria-label="ออกจากระบบ"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}