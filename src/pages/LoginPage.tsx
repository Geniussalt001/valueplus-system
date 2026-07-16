import {
  useEffect,
  useState,
} from "react";

import {
  Building2,
  ChevronRight,
  Eye,
  EyeOff,
  Link2,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  authService,
} from "../auth/authService";

import type {
  AuthSession,
} from "../auth/auth.types";

import {
  BrandLogo,
} from "../components/BrandLogo";

interface LoginPageProps {
  onLogin: (
    session: AuthSession,
  ) => void;
}

interface LoginAccount {
  userCode: string;
  displayName: string;
  icon: typeof Building2;
}

const loginAccounts: LoginAccount[] = [
  {
    userCode: "OFFICE",
    displayName: "Office",
    icon: Building2,
  },
  {
    userCode: "HEADOFFICE",
    displayName: "Headoffice",
    icon: Users,
  },
];

export function LoginPage({
  onLogin,
}: LoginPageProps) {
  const [
    selectedAccount,
    setSelectedAccount,
  ] = useState<LoginAccount | null>(
    null,
  );

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    lockSeconds,
    setLockSeconds,
  ] = useState(0);

  useEffect(() => {
    if (lockSeconds <= 0) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setLockSeconds(
          (current) =>
            Math.max(
              current - 1,
              0,
            ),
        );
      }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [lockSeconds]);

  const chooseAccount = (
    account: LoginAccount,
  ) => {
    if (loading) {
      return;
    }

    setSelectedAccount(account);
    setPassword("");
    setError("");
    setShowPassword(false);
  };

  const submitLogin = async () => {
    if (!selectedAccount) {
      setError(
        "กรุณาเลือกหน่วยงาน",
      );
      return;
    }

    if (!password.trim()) {
      setError(
        "กรุณากรอกรหัสผ่าน",
      );
      return;
    }

    if (lockSeconds > 0) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const session =
        await authService.login({
          userCode:
            selectedAccount.userCode,
          password,
        });

      onLogin(session);
    } catch (requestError) {
      handleLoginError(
        requestError,
        setError,
        setLockSeconds,
      );
    } finally {
      setLoading(false);
    }
  };

  const isLocked =
    lockSeconds > 0;

  return (
    <main
      className="login-background relative flex min-h-screen items-center justify-end overflow-hidden bg-cover bg-center px-6 py-10 lg:px-20"
      style={{
        backgroundImage:
          "url('/images/login-background.png')",
      }}
    >
      <div className="tron-grid pointer-events-none absolute inset-0 opacity-15" />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#020812]/10 to-[#020812]/85" />

      <div className="energy-orb energy-orb-one" />
      <div className="energy-orb energy-orb-two" />

      <section className="login-card relative z-10 w-full max-w-[500px] overflow-hidden p-8 backdrop-blur-xl sm:p-10">
        <span className="energy-particle particle-one" />
        <span className="energy-particle particle-two" />
        <span className="energy-particle particle-three" />

        <div className="relative z-10">
          <BrandLogo size="medium" />

          <div className="mt-7 h-px bg-gradient-to-r from-cyan-300/70 via-cyan-300/20 to-transparent" />

          <div className="mt-7">
            <div className="flex items-center gap-2 text-cyan-300">
              <ShieldCheck size={18} />

              <span className="text-xs font-semibold tracking-[0.18em]">
                INTERNAL ACCESS
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-semibold text-white">
              เลือกหน่วยงาน
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              ระบบกลางติดตาม รับ และตรวจสอบเอกสาร PDF
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {loginAccounts.map(
              (account) => {
                const Icon =
                  account.icon;

                const selected =
                  selectedAccount
                    ?.userCode ===
                  account.userCode;

                return (
                  <button
                    key={
                      account.userCode
                    }
                    type="button"
                    onClick={() =>
                      chooseAccount(
                        account,
                      )
                    }
                    className={`relative rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-cyan-300/50 bg-cyan-300/10 shadow-[0_0_25px_rgba(34,211,238,0.08)]"
                        : "border-slate-700/70 bg-slate-900/35 hover:border-cyan-300/25 hover:bg-cyan-300/[0.04]"
                    }`}
                  >
                    <Icon
                      size={20}
                      className={
                        selected
                          ? "text-cyan-300"
                          : "text-slate-500"
                      }
                    />

                    <p className="mt-4 text-sm font-semibold text-white">
                      {
                        account.displayName
                      }
                    </p>

                    {selected && (
                      <span className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]" />
                    )}
                  </button>
                );
              },
            )}
          </div>

          {selectedAccount && (
            <div className="mt-5">
              <label className="block">
                <span className="mb-2 block text-xs text-slate-400">
                  รหัสผ่าน
                </span>

                <div className="relative">
                  <LockKeyhole
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
                  />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    disabled={
                      loading ||
                      isLocked
                    }
                    onChange={(
                      event,
                    ) => {
                      setPassword(
                        event.target.value,
                      );
                      setError("");
                    }}
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        void submitLogin();
                      }
                    }}
                    placeholder="กรอกรหัสผ่าน"
                    autoFocus
                    className="h-12 w-full rounded-xl border border-slate-700/70 bg-[#020b16]/80 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/45 disabled:cursor-not-allowed disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current,
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 transition hover:text-cyan-300"
                    aria-label={
                      showPassword
                        ? "ซ่อนรหัสผ่าน"
                        : "แสดงรหัสผ่าน"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </label>
            </div>
          )}

          {isLocked && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] px-4 py-3">
              <Link2
                size={18}
                className="text-amber-300"
              />

              <div>
                <p className="text-xs font-medium text-amber-200">
                  ระบบถูกล็อกชั่วคราว
                </p>

                <p className="mt-1 text-[10px] text-amber-300/75">
                  ลองใหม่อีกครั้งใน{" "}
                  {lockSeconds} วินาที
                </p>
              </div>
            </div>
          )}

          {error && !isLocked && (
            <p className="mt-4 rounded-xl border border-red-300/20 bg-red-300/[0.07] px-4 py-3 text-xs leading-6 text-red-200">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={
              !selectedAccount ||
              !password.trim() ||
              loading ||
              isLocked
            }
            onClick={() =>
              void submitLogin()
            }
            className="login-button group mt-6 flex w-full items-center justify-between px-6 py-4 text-left disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>
              <span className="block text-base font-semibold text-white">
                {loading
                  ? "กำลังตรวจสอบ..."
                  : "เข้าสู่ระบบ"}
              </span>

              <span className="mt-1 block text-[11px] tracking-[0.18em] text-cyan-300">
                VALUEPLUS SECURE ACCESS
              </span>
            </span>

            {loading ? (
              <LoaderCircle
                size={22}
                className="animate-spin text-cyan-300"
              />
            ) : (
              <ChevronRight
                size={23}
                className="text-cyan-300 transition-transform group-hover:translate-x-1"
              />
            )}
          </button>

          <div className="mt-7 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              VALUEPLUS RETAIL CO., LTD.
            </span>

            <span className="flex items-center gap-2 text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7]" />
              SECURE
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function handleLoginError(
  error: unknown,
  setError: (
    message: string,
  ) => void,
  setLockSeconds: (
    seconds: number,
  ) => void,
) {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  if (
    message.startsWith(
      "ACCOUNT_LOCKED:",
    )
  ) {
    const seconds = Number(
      message.split(":")[1],
    );

    setLockSeconds(
      Number.isFinite(seconds)
        ? seconds
        : 20,
    );

    setError("");
    return;
  }

  if (
    message.startsWith(
      "INVALID_PASSWORD:",
    )
  ) {
    const remaining =
      message.split(":")[1];

    setError(
      `รหัสผ่านไม่ถูกต้อง เหลือโอกาสอีก ${remaining} ครั้ง`,
    );
    return;
  }

  if (
    message ===
      "SESSION_EXPIRED" ||
    message ===
      "SESSION_REQUIRED"
  ) {
    setError(
      "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
    );
    return;
  }

  setError(message);
}