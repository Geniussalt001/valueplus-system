export type AppToastTone =
  | "info"
  | "success"
  | "warning"
  | "error";

export interface AppToastDetail {
  id: string;
  title: string;
  message?: string;
  tone: AppToastTone;
  durationMs: number;
}

export const APP_TOAST_EVENT =
  "valueplus:toast";

export function showAppToast(
  toast: {
    title: string;
    message?: string;
    tone?: AppToastTone;
    durationMs?: number;
  },
) {
  if (typeof window === "undefined") {
    return;
  }

  const detail: AppToastDetail = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: toast.title,
    message: toast.message,
    tone: toast.tone ?? "info",
    durationMs: toast.durationMs ?? 4000,
  };

  window.dispatchEvent(
    new CustomEvent<AppToastDetail>(
      APP_TOAST_EVENT,
      { detail },
    ),
  );
}
