import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  AuthSession,
} from "../../auth/auth.types";

import {
  AUTH_SESSION_CHANGED_EVENT,
  getAuthSession,
} from "../../auth/authSession";

function getDisplayLocation(
  session: AuthSession | null,
): string {
  if (!session?.user) {
    return "";
  }

  const userCode = String(
    session.user.userCode || "",
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
    session.user.displayName || "",
  ).trim();
}

export default function GlobalUserIdentity() {
  const [session, setSession] =
    useState<AuthSession | null>(() =>
      getAuthSession(),
    );

  const refreshSession = useCallback(() => {
    setSession(getAuthSession());
  }, []);

  useEffect(() => {
    window.addEventListener(
      AUTH_SESSION_CHANGED_EVENT,
      refreshSession,
    );

    window.addEventListener(
      "storage",
      refreshSession,
    );

    window.addEventListener(
      "focus",
      refreshSession,
    );

    return () => {
      window.removeEventListener(
        AUTH_SESSION_CHANGED_EVENT,
        refreshSession,
      );

      window.removeEventListener(
        "storage",
        refreshSession,
      );

      window.removeEventListener(
        "focus",
        refreshSession,
      );
    };
  }, [refreshSession]);

  const displayLocation =
    getDisplayLocation(session);

  if (!session || !displayLocation) {
    return null;
  }

  return (
    <div
      className="
        pointer-events-none
        fixed right-[104px] top-[38px] z-[9999]
        hidden items-center gap-2
        rounded-lg border border-cyan-400/20
        bg-[#061522]/90
        px-3 py-2
        shadow-[0_0_22px_rgba(34,211,238,0.08)]
        backdrop-blur-md
        lg:flex
      "
      aria-label={`ผู้ใช้งาน ${displayLocation}`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className="
            absolute inline-flex h-full w-full
            animate-ping rounded-full
            bg-emerald-400 opacity-50
          "
        />

        <span
          className="
            relative inline-flex h-2 w-2
            rounded-full bg-emerald-400
            shadow-[0_0_8px_rgba(52,211,153,0.9)]
          "
        />
      </span>

      <span
        className="
          text-[11px] font-semibold
          tracking-[0.16em] text-cyan-100
        "
      >
        {displayLocation}
      </span>
    </div>
  );
}