import {
  useEffect,
  useState,
} from "react";

import {
  CheckCircle2,
  CircleAlert,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  APP_TOAST_EVENT,
  type AppToastDetail,
} from "../../services/appToast";

interface VisibleToast extends AppToastDetail {
  closing: boolean;
}

const toneStyles = {
  info: {
    icon: Info,
    className:
      "border-sky-200 bg-white text-sky-700",
  },
  success: {
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-white text-emerald-700",
  },
  warning: {
    icon: TriangleAlert,
    className:
      "border-amber-200 bg-white text-amber-700",
  },
  error: {
    icon: CircleAlert,
    className:
      "border-red-200 bg-white text-red-700",
  },
};

export function AppToastViewport() {
  const [toasts, setToasts] =
    useState<VisibleToast[]>([]);

  useEffect(() => {
    const timers = new Map<string, number>();

    const closeToast = (id: string) => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id
            ? { ...toast, closing: true }
            : toast,
        ),
      );

      const removeTimer = window.setTimeout(() => {
        setToasts((current) =>
          current.filter((toast) => toast.id !== id),
        );
        timers.delete(id);
      }, 260);

      timers.set(`${id}:remove`, removeTimer);
    };

    const handleToast = (event: Event) => {
      const detail = (
        event as CustomEvent<AppToastDetail>
      ).detail;

      setToasts((current) => [
        ...current.slice(-2),
        { ...detail, closing: false },
      ]);

      const timer = window.setTimeout(
        () => closeToast(detail.id),
        detail.durationMs,
      );
      timers.set(detail.id, timer);
    };

    window.addEventListener(
      APP_TOAST_EVENT,
      handleToast,
    );

    return () => {
      window.removeEventListener(
        APP_TOAST_EVENT,
        handleToast,
      );
      timers.forEach((timer) =>
        window.clearTimeout(timer),
      );
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed right-5 top-20 z-[12000] flex w-[min(390px,calc(100vw-2.5rem))] flex-col gap-3"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const tone = toneStyles[toast.tone];
        const Icon = tone.icon;

        return (
          <div
            key={toast.id}
            className={`app-toast pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-[0_18px_50px_rgba(15,23,42,0.2)] ${tone.className} ${toast.closing ? "app-toast-closing" : ""}`}
            role="status"
          >
            <Icon
              size={20}
              className="mt-0.5 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {toast.title}
              </p>
              {toast.message && (
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              type="button"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={() => {
                setToasts((current) =>
                  current.filter((item) => item.id !== toast.id),
                );
              }}
              aria-label="ปิดการแจ้งเตือน"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
