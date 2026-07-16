import type { LucideIcon } from "lucide-react";

export type PublicScreen = "login" | "splash";

export type WorkRoute =
  | "dashboard"
  | "daily-picking"
  | "daily-so"
  | "split-rename-po"
  | "daily-summary"
  | "po-data";

export type AppRoute = PublicScreen | WorkRoute;

export interface SystemModule {
  id: number;
  route: WorkRoute;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  color: string;
  status: "ready" | "development";
}