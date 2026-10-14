import type {
  LucideIcon,
} from "lucide-react";

export type WorkspaceScope =
  | "retail"
  | "head-office";

export type WorkRoute =
  | "dashboard"
  | "daily-posting"
  | "daily-picking"
  | "daily-so"
  | "worldwide-sales"
  | "sales-billing"
  | "split-rename-po"
  | "daily-summary"
  | "po-data"
  | "product-catalog"
  | "receivables-freight";

export type AppRoute =
  | "login"
  | "splash"
  | WorkRoute;

export type SystemStatus =
  | "online"
  | "offline";

export interface SystemModule {
  id: number;
  route: WorkRoute;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  color: string;
  status: SystemStatus;
  workspaces: WorkspaceScope[];
}
