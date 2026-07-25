import {
  callAppsScript,
} from "../services/appsScriptClient";

import {
  clearAuthSession,
  saveAuthSession,
} from "./authSession";

import type {
  AppUser,
  AuthSession,
  LoginInput,
} from "./auth.types";

interface LoginResponse {
  token?: string;
  sessionToken?: string;
  expiresAt?: string;
  user: AppUser;
}

export const authService = {
  async select(
    userCode: string,
  ): Promise<AuthSession> {
    const response =
      await callAppsScript<LoginResponse>(
        "auth.select",
        {
          userCode,
        },
        {
          requireSession: false,
        },
      );

    const token =
      String(
        response.sessionToken ||
          response.token ||
          "",
      ).trim();

    if (!token) {
      throw new Error(
        "Apps Script ไม่ได้ส่ง Session Token กลับมา",
      );
    }

    const session: AuthSession = {
      token,
      sessionToken: token,
      expiresAt: String(
        response.expiresAt || "",
      ),
      user: response.user,
    };

    saveAuthSession(session);

    return session;
  },

  async login(
    input: LoginInput,
  ): Promise<AuthSession> {
    const response =
      await callAppsScript<LoginResponse>(
        "auth.login",
        input,
        {
          requireSession: false,
        },
      );

    const token =
      String(
        response.sessionToken ||
          response.token ||
          "",
      ).trim();

    if (!token) {
      throw new Error(
        "Apps Script ไม่ได้ส่ง Session Token กลับมา",
      );
    }

    const session: AuthSession = {
      token,
      sessionToken: token,
      expiresAt: String(
        response.expiresAt || "",
      ),
      user: response.user,
    };

    saveAuthSession(session);

    return session;
  },

  async logout(): Promise<void> {
    try {
      await callAppsScript<{
        success: boolean;
      }>("auth.logout");
    } finally {
      clearAuthSession();
    }
  },
};