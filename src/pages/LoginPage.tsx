import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  Building2,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  Warehouse,
  Wifi,
} from "lucide-react";

import type {
  AppUser,
} from "../auth/auth.types";

import {
  authService,
} from "../auth/authService";

import { BrandLogo } from "../components/BrandLogo";
import "./LoginPage.css";

import { AppVersionBadge } from "../components/common/AppVersionBadge";

import {
  activateAppsScript,
  hasAppsScriptConnection,
  warmAppsScriptConnection,
} from "../services/appsScriptClient";

interface LoginPageProps {
  onLogin: (
    user: AppUser,
  ) => void;
}

const accounts = [
  {
    code: "OFFICE",
    accent: "green",
    label: "คลังสินค้า",
    englishLabel: "WAREHOUSE",
    description:
      "สำหรับจัดการคลังสินค้าและประมวลผลงานประจำวัน",
    icon: Warehouse,
  },
  {
    code: "HEADOFFICE",
    accent: "violet",
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
  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "สวัสดีตอนเช้า";
    }

    if (hour < 17) {
      return "สวัสดีตอนบ่าย";
    }

    return "สวัสดีตอนเย็น";
  }, []);

  const [
    connectionState,
    setConnectionState,
  ] = useState<
    | "checking"
    | "required"
    | "activating"
    | "ready"
  >("checking");

  const [
    activationCode,
    setActivationCode,
  ] = useState("");

  const [
    loadingCode,
    setLoadingCode,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let active = true;

    void warmAppsScriptConnection()
      .catch(() => {
        // Login remains available if the optional warm-up fails.
      });

    async function checkConnection() {
      try {
        const connected =
          await hasAppsScriptConnection();

        if (active) {
          setConnectionState(
            connected
              ? "ready"
              : "required",
          );
        }
      } catch (requestError) {
        if (active) {
          setConnectionState(
            "required",
          );
          setError(
            requestError instanceof
              Error
              ? requestError.message
              : String(
                  requestError,
                ),
          );
        }
      }
    }

    void checkConnection();

    return () => {
      active = false;
    };
  }, []);

  const activateSystem =
    async () => {
      if (
        connectionState ===
          "activating" ||
        !activationCode.trim()
      ) {
        return;
      }

      setConnectionState(
        "activating",
      );
      setError("");

      try {
        await activateAppsScript(
          activationCode,
        );

        setActivationCode("");
        setConnectionState(
          "ready",
        );
      } catch (requestError) {
        setConnectionState(
          "required",
        );
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : String(
                requestError,
              ),
        );
      }
    };

  const selectAccount = async (
    userCode: string,
  ) => {
    if (loadingCode) {
      return;
    }

    setLoadingCode(userCode);
    setError("");

    try {
      try {
        await warmAppsScriptConnection();
      } catch {
        // Continue to the authenticated request. Its dedicated retry
        // policy handles a temporary Apps Script warm-up failure.
      }

      const session =
        await authService.select(
          userCode,
        );

      onLogin(session.user);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : String(requestError);

      if (
        message ===
        "ACTIVATION_REQUIRED"
      ) {
        setConnectionState(
          "required",
        );
        setError(
          "สิทธิ์ของเครื่องหมดอายุ กรุณากรอกรหัสเปิดใช้งานอีกครั้ง",
        );
      } else {
        setError(message);
      }
    } finally {
      setLoadingCode("");
    }
  };

  const warmLoginConnection = () => {
    void warmAppsScriptConnection()
      .catch(() => {
        // The real login request reports any connection error.
      });
  };

  const statusLabel = loadingCode
    ? "กำลังเข้าสู่ระบบ"
    : connectionState === "ready"
      ? "ACCESS READY"
      : connectionState === "checking"
        ? "กำลังตรวจสอบ"
        : connectionState === "activating"
          ? "กำลังเชื่อมต่อ"
          : "รอเปิดใช้งาน";

  return (
    <main className="doom-login">
      <div className="doom-login-ambient" aria-hidden="true" />
      <section className="doom-login-wrap" aria-labelledby="login-title">
        <div className="doom-login-card">
          <header className="doom-login-brand">
            <BrandLogo size="medium" className="doom-login-logo" />
          </header>
          <div className="doom-login-eyebrow">
            <ShieldCheck size={16} aria-hidden="true" />
            VALUEPLUS COMMAND SYSTEM
          </div>
          <h1 id="login-title" className="doom-login-title">{greeting}</h1>
          <p className="doom-login-hint">เลือกพื้นที่ทำงานเพื่อเริ่มภารกิจของคุณ</p>

          {connectionState === "checking" && (
            <div className="doom-login-checking" role="status">
              <LoaderCircle size={28} className="doom-login-spinner" aria-hidden="true" />
              <strong>กำลังตรวจสอบการเชื่อมต่อ</strong>
              <span>กรุณารอสักครู่</span>
            </div>
          )}

          {(connectionState === "required" || connectionState === "activating") && (
            <form className="doom-login-activation" onSubmit={(event) => {
              event.preventDefault();
              void activateSystem();
            }} aria-busy={connectionState === "activating"}>
              <div className="doom-login-activation-heading">
                <Wifi size={22} aria-hidden="true" />
                <div>
                  <strong>เชื่อมต่อระบบครั้งแรก</strong>
                  <p>กรอกรหัสเปิดใช้งานสำหรับเครื่องนี้</p>
                </div>
              </div>
              <label htmlFor="login-activation-code">รหัสเปิดใช้งาน</label>
              <div className="doom-login-input">
                <KeyRound size={18} aria-hidden="true" />
                <input id="login-activation-code" autoFocus required
                  autoComplete="off" spellCheck={false}
                  value={activationCode} disabled={connectionState === "activating"}
                  aria-describedby={error ? "login-error" : undefined}
                  onChange={(event) => { setActivationCode(event.target.value); setError(""); }}
                  placeholder="กรอกรหัสที่ได้รับ" />
              </div>
              <button type="submit" className="doom-login-primary"
                disabled={!activationCode.trim() || connectionState === "activating"}>
                {connectionState === "activating"
                  ? <LoaderCircle size={18} className="doom-login-spinner" aria-hidden="true" />
                  : <ShieldCheck size={18} aria-hidden="true" />}
                เชื่อมต่อระบบ
              </button>
            </form>
          )}

          {connectionState === "ready" && (
            <div className="doom-login-options" aria-busy={Boolean(loadingCode)}>
              {accounts.map((account) => {
                const Icon = account.icon;
                const loading = loadingCode === account.code;
                return (
                  <button key={account.code} type="button" className="doom-login-option"
                    data-accent={account.accent} data-loading={loading}
                    disabled={Boolean(loadingCode)}
                    onPointerEnter={warmLoginConnection} onFocus={warmLoginConnection}
                    onClick={() => { void selectAccount(account.code); }}>
                    <span className="doom-login-icon"><Icon size={23} aria-hidden="true" /></span>
                    <span className="doom-login-option-copy">
                      <span className="doom-login-option-title">{account.label}</span>
                      <span className="doom-login-option-code">ACCESS // {account.englishLabel}</span>
                      <span className="doom-login-option-desc">
                        {loading ? "กำลังเข้าสู่พื้นที่ทำงาน…" : account.description}
                      </span>
                    </span>
                    <span className="doom-login-arrow">
                      {loading
                        ? <LoaderCircle size={19} className="doom-login-spinner" aria-hidden="true" />
                        : <ArrowRight size={20} aria-hidden="true" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {error && <p id="login-error" className="doom-login-error" role="alert">{error}</p>}
          <footer className="doom-login-footer">
            <div>
              <span>VALUEPLUS RETAIL CO., LTD.</span>
              <AppVersionBadge className="doom-login-version" />
            </div>
            <span className="doom-login-status" data-ready={connectionState === "ready" && !loadingCode}
              role="status">{statusLabel}</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
