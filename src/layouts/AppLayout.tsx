import type {
  ReactNode,
} from "react";

import {
  Building2,
  ChevronRight,
  Home,
  Link2,
  LockKeyhole,
  LogOut,
  ShoppingBag,
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
  NotificationCenter,
} from "../components/notifications/NotificationCenter";

import {
  systemModules,
} from "../data/systemModules";

import type {
  WorkspaceScope,
  WorkRoute,
} from "../types/app";

interface AppLayoutProps {
  children: ReactNode;
  currentRoute: WorkRoute;
  currentUser: AppUser;
  workspaceScope: WorkspaceScope;
  onWorkspaceChange: (
    workspace: WorkspaceScope,
  ) => void;
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
  workspaceScope,
  onWorkspaceChange,
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

  const availableModules =
    systemModules.filter(
      (module) =>
        module.workspaces.includes(
          workspaceScope,
        ),
    );

  return (
    <main className="dashboard min-h-screen bg-[#f4faff] text-[#10243a]">
      <div className="tron-grid pointer-events-none fixed inset-0 opacity-[0.08]" />

      <aside className="dashboard-sidebar fixed bottom-0 left-0 top-0 z-30 hidden w-72 flex-col overflow-y-auto border-r border-cyan-600/15 bg-white/95 p-6 backdrop-blur-xl lg:flex">
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
          WORKSPACE
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
          <button
            type="button"
            onClick={() =>
              onWorkspaceChange(
                "retail",
              )
            }
            className={`
              flex
              items-center
              justify-center
              gap-2
              rounded-lg
              px-2
              py-2.5
              text-xs
              font-medium
              transition
              ${
                workspaceScope ===
                "retail"
                  ? "border border-cyan-500 bg-cyan-500 text-white shadow-md shadow-cyan-500/25"
                  : "border border-transparent text-cyan-700 hover:bg-cyan-50"
              }
            `}
          >
            <ShoppingBag size={15} />
            Retail
          </button>

          <button
            type="button"
            onClick={() =>
              onWorkspaceChange(
                "head-office",
              )
            }
            className={`
              flex
              items-center
              justify-center
              gap-2
              rounded-lg
              px-2
              py-2.5
              text-xs
              font-medium
              transition
              ${
                workspaceScope ===
                "head-office"
                  ? "border border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-500/25"
                  : "border border-transparent text-violet-700 hover:bg-violet-50"
              }
            `}
          >
            <Building2 size={15} />
            สำนักงานใหญ่
          </button>
        </div>

        <p className="mt-6 px-3 text-[10px] tracking-[0.22em] text-slate-600">
          MAIN NAVIGATION
        </p>

        <nav className="mt-5 space-y-2.5">
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

          <p className="px-3 pb-2 pt-6 text-[10px] tracking-[0.2em] text-slate-700">
            WORK MODULES
          </p>

          {availableModules.map(
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
                      className="status-light status-processing ml-auto"
                      aria-hidden="true"
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

        <div className="mt-auto space-y-3 pt-6">
          <UpdateCenter />

          <p className="pt-2 text-[10px] tracking-[0.15em] text-slate-700">
            VALUEPLUS SYSTEM · AUTO UPDATE
          </p>
        </div>
      </aside>

      <section className="relative z-10 min-h-screen lg:ml-72">
        <header className="app-red-header sticky top-0 z-20 flex min-h-20 items-center justify-between border-b border-cyan-600/15 bg-white/90 px-6 backdrop-blur-xl lg:px-10">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-cyan-300">
              VALUEPLUS WORKSPACE
            </p>

            <h1 className="mt-1 text-lg font-semibold">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <NotificationCenter
              currentUser={currentUser}
              onNavigate={onNavigate}
            />

            <div className="hidden items-center gap-2.5 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.04] px-3 py-2 sm:flex">
              <span
                className="status-light status-online"
                aria-hidden="true"
              />

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
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 shadow-sm transition hover:border-red-400/60 hover:bg-red-50 hover:text-red-600"
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div
          key={currentRoute}
          className="page-motion"
        >
          {children}
        </div>
      </section>
    </main>
  );
}
