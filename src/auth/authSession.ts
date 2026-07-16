import type {
  AuthSession,
} from "./auth.types";

const AUTH_SESSION_KEY =
  "valueplus-auth-session";

export const AUTH_SESSION_CHANGED_EVENT =
  "valueplus-auth-session-changed";

function notifyAuthSessionChanged(): void {
  window.dispatchEvent(
    new CustomEvent(
      AUTH_SESSION_CHANGED_EVENT,
    ),
  );
}

function normalizeSession(
  session: Partial<AuthSession>,
): AuthSession | null {
  const token =
    String(
      session.sessionToken ||
        session.token ||
        "",
    ).trim();

  if (!token || !session.user) {
    return null;
  }

  return {
    ...session,
    token,
    sessionToken: token,
    expiresAt: String(
      session.expiresAt || "",
    ),
    user: session.user,
  };
}

export function saveAuthSession(
  session: AuthSession,
): void {
  const normalized =
    normalizeSession(session);

  if (!normalized) {
    throw new Error(
      "SESSION_REQUIRED",
    );
  }

  sessionStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify(normalized),
  );

  notifyAuthSessionChanged();
}

export function getAuthSession():
  | AuthSession
  | null {
  const rawSession =
    sessionStorage.getItem(
      AUTH_SESSION_KEY,
    );

  if (!rawSession) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(
        rawSession,
      ) as Partial<AuthSession>;

    const session =
      normalizeSession(parsed);

    if (!session) {
      clearAuthSession();
      return null;
    }

    if (
      session.expiresAt &&
      isSessionExpired(
        session.expiresAt,
      )
    ) {
      clearAuthSession();
      return null;
    }

    return session;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function getSessionToken(): string {
  const session =
    getAuthSession();

  return (
    session?.sessionToken ||
    session?.token ||
    ""
  );
}

export function clearAuthSession(): void {
  sessionStorage.removeItem(
    AUTH_SESSION_KEY,
  );

  notifyAuthSessionChanged();
}

function isSessionExpired(
  expiresAt: string,
): boolean {
  const expiresTime =
    new Date(expiresAt).getTime();

  if (Number.isNaN(expiresTime)) {
    return false;
  }

  return Date.now() >= expiresTime;
}