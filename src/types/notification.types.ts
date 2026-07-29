export type NotificationArchiveSection =
  | "po-seven"
  | "receivables";

export interface ValuePlusNotification {
  id: string;
  category: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  archiveSection: NotificationArchiveSection;
  createdAt: string;
  createdBy: string;
  readAt: string;
  readBy: string;
}

export interface NotificationListResult {
  unreadCount: number;
  notifications: ValuePlusNotification[];
}
