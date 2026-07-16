import type {
  ReactNode,
} from "react";

import {
  ChevronRight,
  Home,
  Link2,
  LockKeyhole,
  LogOut,
  Server,
  UserRound,
} from "lucide-react";

import type {
  AppUser,
} from "../auth/auth.types";

import {
  BrandLogo,
} from "../components/BrandLogo";

import {
  LiveClock,
} from "../components/LiveClock";

import {
  UpdateCenter,
} from "../components/update/UpdateCenter";

import {
  systemModules,
} from "../data/systemModules";

import type {
  WorkRoute,
} from "../types/app";

interface AppLayoutProps {
  children: ReactNode;
  currentRoute: WorkRoute;
  currentUser: AppUser;
  onNavigate: (
    route: WorkRoute,
  ) => void;
  onLogout: () => void;
}

function getWorkspaceName(
  currentUser: AppUser,
): string {
  const userCode = String(
    currentUser.userCode || "",
  )
    .trim()
    .toUpperCase();

  if (userCode === "OFFICE") {
    return "Office";
  }

  if (userCode === "HEADOFFICE") {
    return "Headoffice";
  }

  return String(
    currentUser.displayName || "",
  ).trim();
}

export function AppLayout({
  children,
  currentRoute,
  currentUser,
  onNavigate,
  onLogout,
}: AppLayoutProps) {
  const currentModule =
    systemModules.find(
      (module) =>
        module.route ===
        currentRoute,
    );

  const pageTitle =
    currentRoute === "dashboard"
      ? "ValuePlus Dashboard"
      : currentModule?.title ??
        "ValuePlus System";

  const workspaceName =
    getWorkspaceName(currentUser);

  return (
    <main className="dashboard min-h-screen bg-[#020812] text-white">
      <div className="tron-grid pointer-events-none fixed inset-0 opacity-[0.08]" />

      <aside className="dashboard-sidebar fixed bottom-0 left-0 top-0 z-30 hidden w-72 flex-col border-r border-cyan-300/10 bg-[#030d19]/95 p-6 backdrop-blur-xl lg:flex">
        <button
          type="button"
          onClick={() =>
            onNavigate("dashboard")
          }
          className="text-left"
          aria-label="กลับหน้าแดชบอร์ด"
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
            onClick={() =>
              onNavigate("dashboard")
            }
            className={`sidebar-item ${
              currentRoute ===
              "dashboard"
                ? "sidebar-item-active"
                : ""
            }`}
          >
            <Home size={17} />

            <span>แดชบอร์ด</span>

            <ChevronRight
              size={14}
              className="ml-auto"
            />
          </button>

          <p className="px-3 pb-1 pt-5 text-[10px] tracking-[0.2em] text-slate-700">
            WORK MODULES
          </p>

          {systemModules.map(
            (module) => {
              const Icon =
                module.icon;

              const isActive =
                currentRoute ===
                module.route;

              const isOnline =
                module.status ===
                "online";

              return (
                <button
                  key={module.route}
                  type="button"
                  disabled={!isOnline}
                  onClick={() => {
                    if (!isOnline) {
                      return;
                    }

                    onNavigate(
                      module.route,
                    );
                  }}
                  title={
                    isOnline
                      ? module.title
                      : "ระบบนี้ยังไม่เปิดใช้งาน"
                  }
                  aria-label={
                    isOnline
                      ? `เปิดระบบ ${module.title}`
                      : `${module.title} ยังไม่เปิดใช้งาน`
                  }
                  className={`
                    sidebar-item
                    ${
                      isActive
                        ? "sidebar-item-active"
                        : ""
                    }
                    ${
                      isOnline
                        ? ""
                        : "cursor-not-allowed opacity-45 grayscale disabled:pointer-events-none"
                    }
                  `}
                >
                  <Icon
                    size={17}
                    style={{
                      color:
                        isActive &&
                        isOnline
                          ? module.color
                          : undefined,
                    }}
                  />

                  <span className="truncate">
                    {module.title}
                  </span>

                  {!isOnline ? (
                    <span className="ml-auto flex items-center gap-1 text-red-300/70">
                      <Link2 size={11} />

                      <LockKeyhole
                        size={13}
                      />
                    </span>
                  ) : isActive ? (
                    <span
                      className="ml-auto h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          module.color,
                        boxShadow: `0 0 8px ${module.color}`,
                      }}
                    />
                  ) : (
                    <ChevronRight
                      size={13}
                      className="ml-auto opacity-40"
                    />
                  )}
                </button>
              );
            },
          )}
        </nav>

        <div className="mt-auto space-y-3">
          <UpdateCenter />

          <div className="rounded-xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4">
            <div className="flex items-center gap-3">
              <Server
                size={18}
                className="text-emerald-300"
              />

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

          <p className="pt-2 text-[10px] tracking-[0.15em] text-slate-700">
            VALUEPLUS SYSTEM · AUTO UPDATE
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

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2.5 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.04] px-3 py-2 sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />

                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              </span>

              <UserRound
                size={15}
                className="text-cyan-300"
              />

              <span className="text-xs font-medium tracking-[0.08em] text-cyan-100">
                {workspaceName}
              </span>
            </div>

            <LiveClock />

            <button
              type="button"
              onClick={onLogout}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 text-slate-400 transition hover:border-red-400/50 hover:text-red-300"
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
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