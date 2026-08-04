import type {
  CSSProperties,
  ReactNode,
} from "react";
import {
  useState,
} from "react";

import {
  Building2,
  Home,
  Link2,
  LockKeyhole,
  LogOut,
  RefreshCw,
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
  const [isUpdateOpen, setIsUpdateOpen] =
    useState(false);

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

      <section className="relative z-10 min-h-screen">
        <header className="top-navigation-shell sticky top-0 z-40">
          <div className="top-utility-bar">
            <button
              type="button"
              onClick={() => {
                setIsUpdateOpen(false);
                onNavigate("dashboard");
              }}
              className="top-brand-button"
              aria-label="กลับหน้าแดชบอร์ด"
            >
              <BrandLogo size="medium" />
            </button>

            <div className="top-workspace-switcher" aria-label="เลือกพื้นที่ทำงาน">
              <button
                type="button"
                onClick={() => onWorkspaceChange("retail")}
                className={`top-workspace-button workspace-retail-button ${
                  workspaceScope === "retail" ? "workspace-retail-active" : ""
                }`}
              >
                <ShoppingBag size={15} />
                <span className="top-workspace-copy">
                  <strong>Retail</strong>
                  <small>งานหน้าร้าน</small>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onWorkspaceChange("head-office")}
                className={`top-workspace-button workspace-head-office-button ${
                  workspaceScope === "head-office" ? "workspace-head-office-active" : ""
                }`}
              >
                <Building2 size={15} />
                <span className="top-workspace-copy">
                  <strong>สำนักงานใหญ่</strong>
                  <small>ตรวจสอบและแฟ้มกลาง</small>
                </span>
              </button>
            </div>

            <div className="top-page-context">
              <p>VALUEPLUS WORKSPACE</p>
              <h1>{pageTitle}</h1>
            </div>

            <div className="top-utility-actions">
              <AppsScriptSyncStatus />

              <div className="user-context-chip">
                <span className="status-light status-online" aria-hidden="true" />
                <UserRound size={15} />
                <span>{workspaceName}</span>
              </div>

              <LiveClock />

              <div className="top-update-wrap">
                <button
                  type="button"
                  onClick={() => setIsUpdateOpen((current) => !current)}
                  className={`top-update-button ${isUpdateOpen ? "top-update-button-active" : ""}`}
                  aria-expanded={isUpdateOpen}
                  title="ศูนย์อัปเดต"
                >
                  <RefreshCw size={17} />
                  <span>อัปเดต</span>
                </button>

                {isUpdateOpen ? (
                  <div className="top-update-popover">
                    <UpdateCenter />
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="logout-button top-logout-button"
                aria-label="ออกจากระบบ"
                title="ออกจากระบบ"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <nav className="top-module-navigation" aria-label="เมนูระบบงาน">
            <div className="top-module-scroll">
              <button
                type="button"
                onClick={() => {
                  setIsUpdateOpen(false);
                  onNavigate("dashboard");
                }}
                className={`top-module-tab top-dashboard-tab ${
                  currentRoute === "dashboard" ? "top-module-tab-active" : ""
                }`}
              >
                <span className="top-module-icon"><Home size={19} /></span>
                <span className="top-module-label">แดชบอร์ด</span>
              </button>

              {availableModules.map((module) => {
                const Icon = module.icon;
                const isActive = currentRoute === module.route;
                const isOnline = module.status === "online";

                return (
                  <button
                    key={module.route}
                    type="button"
                    disabled={!isOnline}
                    onClick={() => {
                      if (!isOnline) return;
                      setIsUpdateOpen(false);
                      onNavigate(module.route);
                    }}
                    title={isOnline ? module.title : "ระบบนี้ยังไม่เปิดใช้งาน"}
                    className={`top-module-tab ${
                      isActive ? "top-module-tab-active" : ""
                    } ${!isOnline ? "top-module-tab-offline" : ""}`}
                    style={{
                      "--menu-accent": isOnline ? module.color : "#94a3b8",
                    } as CSSProperties}
                  >
                    <span className="top-module-icon"><Icon size={19} /></span>
                    <span className="top-module-label">{module.title}</span>
                    {!isOnline ? (
                      <span className="top-module-lock"><Link2 size={10} /><LockKeyhole size={11} /></span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </nav>
        </header>

        <div key={currentRoute} className="page-motion top-layout-content">
          {children}
        </div>
      </section>
    </main>
  );
}
