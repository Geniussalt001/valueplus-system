import {
  callAppsScript,
} from "./appsScriptClient";

import type {
  NotificationListResult,
} from "../types/notification.types";

export const notificationService = {
  async listUnread(): Promise<NotificationListResult> {
    return callAppsScript<NotificationListResult>(
      "notification.listUnread",
    );
  },

  async markRead(
    id: string,
  ): Promise<NotificationListResult> {
    return callAppsScript<NotificationListResult>(
      "notification.markRead",
      {
        id,
      },
    );
  },

  async markAllRead(): Promise<NotificationListResult> {
    return callAppsScript<NotificationListResult>(
      "notification.markAllRead",
    );
  },
};
