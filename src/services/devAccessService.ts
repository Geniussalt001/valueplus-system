import {
  callAppsScript,
} from "./appsScriptClient";

export interface DevAccessResult {
  success: boolean;
  locked: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
  message: string;
}

export const devAccessService = {
  async verify(
    userName: string,
    password: string,
  ): Promise<DevAccessResult> {
    return callAppsScript<DevAccessResult>(
      "dev.login",
      {
        userName:
          userName.trim(),
        password,
      },
      {
        queueOnFailure: false,
        retryTransient: false,
        requestProfile:
          "interactive",
      },
    );
  },
};

