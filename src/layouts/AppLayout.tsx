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
  AppsScriptSyncStatus,
} from "../components/AppsScriptSyncStatus";

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

      <aside className="dashboard-sidebar fixed bottom-0 left-0 top-0 z-30 hidden w-72 flex-col overflow-y-auto border-r border-cyan-600/15 bg-white/95 p-5 backdrop-blur-xl lg:flex">
        <button
          type="button"
          onClick={() =>
            onNavigate("dashboard")
          }
          className="sidebar-brand-button text-left"
          aria-label="กลับหน้าแดชบอร์ด"
        >
          <BrandLogo size="medium" />
        </button>

        <div className="my-5 h-px bg-gradient-to-r from-cyan-300/40 to-transparent" />

        <div className="sidebar-user-card flex items-center gap-3 rounded-2xl p-3">
          <span className="sidebar-user-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <UserRound size={18} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {workspaceName}
            </span>
            <span className="mt-0.5 block text-[10px] tracking-[0.12em]">
              VALUEPLUS USER
            </span>
          </span>
          <span className="status-light status-online ml-auto" aria-hidden="true" />
        </div>

        <p className="mt-5 px-3 text-[10px] tracking-[0.22em] text-slate-600">
          WORKSPACE
        </p>

        <div className="workspace-switcher mt-3 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-2">
          <button
            type="button"
            onClick={() =>
              onWorkspaceChange(
                "retail",
              )
            }
            className={`
              workspace-retail-button
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              px-2
              py-3
              text-xs
              font-medium
              transition
              ${
                workspaceScope ===
                "retail"
                  ? "workspace-retail-active bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-md shadow-cyan-900/20"
                  : "border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
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
              workspace-head-office-button
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              px-2
              py-3
              text-xs
              font-medium
              transition
              ${
                workspaceScope ===
                "head-office"
                  ? "workspace-head-office-active bg-gradient-to-r from-violet-600 to-indigo-700 text-white shadow-md shadow-indigo-900/20"
                  : "border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
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

        <nav className="mt-4 space-y-2">
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

        <div className="mt-auto space-y-4 pt-6">
          <UpdateCenter />

          <p className="pt-2 text-[10px] tracking-[0.15em] text-slate-700">
            VALUEPLUS SYSTEM · AUTO UPDATE
          </p>
        </div>
      </aside>

      <section className="relative z-10 min-h-screen lg:ml-72">
        <header className="app-red-header sticky top-0 z-20 flex min-h-20 items-center justify-between gap-6 border-b border-cyan-600/15 bg-white/90 px-6 backdrop-blur-xl lg:px-10">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-cyan-300">
              VALUEPLUS WORKSPACE
            </p>

            <h1 className="mt-1 text-lg font-semibold">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <AppsScriptSyncStatus />

            <div className="user-context-chip hidden min-h-10 items-center gap-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] px-4 py-2 sm:flex">
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
              className="logout-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-500 shadow-sm transition hover:border-red-400/60 hover:bg-red-50 hover:text-red-600"
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
