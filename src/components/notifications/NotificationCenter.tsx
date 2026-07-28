import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bell,
  CheckCheck,
  FolderOpen,
  X,
} from "lucide-react";

import type {
  AppUser,
} from "../../auth/auth.types";

import {
  notificationService,
} from "../../services/notificationService";

import type {
  ValuePlusNotification,
} from "../../types/notification.types";

import type {
  WorkRoute,
} from "../../types/app";

interface NotificationCenterProps {
  currentUser: AppUser;
  onNavigate: (
    route: WorkRoute,
  ) => void;
}

const REFRESH_INTERVAL_MS =
  60_000;

export function NotificationCenter({
  currentUser,
  onNavigate,
}: NotificationCenterProps) {
  const [
    notifications,
    setNotifications,
  ] = useState<
    ValuePlusNotification[]
  >([]);

  const [
    panelOpen,
    setPanelOpen,
  ] = useState(false);

  const [
    toastVisible,
    setToastVisible,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const isHeadOffice =
    String(
      currentUser.userCode || "",
    )
      .trim()
      .toUpperCase() ===
    "HEADOFFICE";

  const unreadCount =
    notifications.length;

  const newestNotification =
    notifications[0];

  const loadNotifications =
    useCallback(
      async (
        showStartupToast = false,
      ) => {
        if (!isHeadOffice) {
          setNotifications([]);
          return;
        }

        setLoading(true);

        try {
          const result =
            await notificationService
              .listUnread();

          setNotifications(
            result.notifications,
          );

          if (
            showStartupToast &&
            result.unreadCount > 0
          ) {
            setToastVisible(true);
          }
        } catch {
          // การแจ้งเตือนไม่ควรขัดขวางงานหลัก
        } finally {
          setLoading(false);
        }
      },
      [isHeadOffice],
    );

  useEffect(() => {
    if (!isHeadOffice) {
      return;
    }

    void loadNotifications(true);

    const timer =
      window.setInterval(() => {
        void loadNotifications();
      }, REFRESH_INTERVAL_MS);

    const refreshOnFocus = () => {
      void loadNotifications();
    };

    window.addEventListener(
      "focus",
      refreshOnFocus,
    );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(
        "focus",
        refreshOnFocus,
      );
    };
  }, [
    isHeadOffice,
    loadNotifications,
  ]);

  useEffect(() => {
    if (!isHeadOffice) {
      document.title =
        "ValuePlus System";
      return;
    }

    document.title =
      unreadCount > 0
        ? `(${unreadCount}) ValuePlus System`
        : "ValuePlus System";

    return () => {
      document.title =
        "ValuePlus System";
    };
  }, [
    isHeadOffice,
    unreadCount,
  ]);

  const summaryText =
    useMemo(() => {
      if (unreadCount === 1) {
        return (
          newestNotification
            ?.message ||
          "มีข้อมูลใหม่ในแฟ้มบันทึกข้อมูล"
        );
      }

      return `มีข้อมูลใหม่ ${unreadCount.toLocaleString(
        "th-TH",
      )} รายการที่ยังไม่ได้ดู`;
    }, [
      newestNotification,
      unreadCount,
    ]);

  if (!isHeadOffice) {
    return null;
  }

  const openNotification =
    async (
      notification:
        ValuePlusNotification,
    ) => {
      sessionStorage.setItem(
        "valueplus-archive-section",
        notification.archiveSection,
      );

      setPanelOpen(false);
      setToastVisible(false);
      onNavigate("po-data");

      try {
        const result =
          await notificationService
            .markRead(
              notification.id,
            );

        setNotifications(
          result.notifications,
        );
      } catch {
        setNotifications(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                notification.id,
            ),
        );
      }
    };

  const openNewest = () => {
    if (newestNotification) {
      void openNotification(
        newestNotification,
      );
      return;
    }

    onNavigate("po-data");
  };

  const markAllRead =
    async () => {
      try {
        const result =
          await notificationService
            .markAllRead();

        setNotifications(
          result.notifications,
        );
      } catch {
        return;
      }

      setToastVisible(false);
    };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setPanelOpen(
              (current) =>
                !current,
            );
            setToastVisible(false);
          }}
          className="
            relative
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-lg
            border
            border-cyan-200
            bg-white
            text-cyan-700
            shadow-sm
            transition
            hover:border-cyan-400
            hover:bg-cyan-50
          "
          aria-label={`การแจ้งเตือน ${unreadCount} รายการ`}
          title="การแจ้งเตือน"
        >
          <Bell size={18} />

          {unreadCount > 0 && (
            <span
              className="
                absolute
                -right-2
                -top-2
                flex
                min-h-5
                min-w-5
                items-center
                justify-center
                rounded-full
                border-2
                border-white
                bg-red-500
                px-1
                text-[10px]
                font-bold
                leading-none
                text-white
                shadow-md
              "
            >
              {unreadCount > 99
                ? "99+"
                : unreadCount}
            </span>
          )}
        </button>

        {panelOpen && (
          <div
            className="
              absolute
              right-0
              top-12
              z-50
              w-[min(390px,calc(100vw-2rem))]
              overflow-hidden
              rounded-2xl
              border
              border-cyan-200
              bg-white
              shadow-2xl
              shadow-cyan-950/15
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-cyan-100
                bg-gradient-to-r
                from-[#073652]
                to-[#075a78]
                px-4
                py-3
                text-white
              "
            >
              <div>
                <p className="text-sm font-semibold">
                  ValuePlus Notification
                </p>
                <p className="mt-0.5 text-[11px] text-cyan-100">
                  แฟ้มบันทึกข้อมูล
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    void markAllRead();
                  }}
                  className="
                    flex
                    items-center
                    gap-1.5
                    rounded-lg
                    border
                    border-white/20
                    bg-white/10
                    px-2.5
                    py-1.5
                    text-[11px]
                    transition
                    hover:bg-white/20
                  "
                >
                  <CheckCheck
                    size={14}
                  />
                  อ่านทั้งหมด
                </button>
              )}
            </div>

            <div className="max-h-[430px] overflow-y-auto p-2">
              {loading &&
              unreadCount === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  กำลังตรวจสอบข้อมูลใหม่...
                </p>
              ) : unreadCount === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  ไม่มีรายการที่ยังไม่ได้ดู
                </p>
              ) : (
                notifications.map(
                  (notification) => (
                    <button
                      key={
                        notification.id
                      }
                      type="button"
                      onClick={() => {
                        void openNotification(
                          notification,
                        );
                      }}
                      className="
                        flex
                        w-full
                        gap-3
                        rounded-xl
                        px-3
                        py-3
                        text-left
                        transition
                        hover:bg-cyan-50
                      "
                    >
                      <span
                        className="
                          mt-0.5
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          rounded-lg
                          bg-cyan-100
                          text-cyan-700
                        "
                      >
                        <FolderOpen
                          size={17}
                        />
                      </span>

                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-800">
                          {
                            notification.title
                          }
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-600">
                          {
                            notification.message
                          }
                        </span>
                        <span className="mt-1.5 block text-[10px] text-slate-400">
                          {formatNotificationTime(
                            notification.createdAt,
                          )}
                        </span>
                      </span>
                    </button>
                  ),
                )
              )}
            </div>
          </div>
        )}
      </div>

      {toastVisible &&
        unreadCount > 0 && (
        <div
          className="
            fixed
            bottom-6
            right-6
            z-[70]
            w-[min(400px,calc(100vw-3rem))]
            overflow-hidden
            rounded-2xl
            border
            border-cyan-300
            bg-white
            shadow-2xl
            shadow-cyan-950/25
          "
        >
          <div className="h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />

          <div className="flex gap-3 p-4">
            <span
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-[#073652]
                text-cyan-200
              "
            >
              <Bell size={20} />
            </span>

            <button
              type="button"
              onClick={openNewest}
              className="min-w-0 flex-1 text-left"
            >
              <p className="text-sm font-semibold text-slate-900">
                มีข้อมูลใหม่จาก Office
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {summaryText}
              </p>
              <p className="mt-2 text-[11px] font-medium text-cyan-700">
                คลิกเพื่อเปิดแฟ้มบันทึกข้อมูล
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setToastVisible(false)
              }
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-lg
                text-slate-400
                transition
                hover:bg-slate-100
                hover:text-slate-700
              "
              aria-label="ปิดการแจ้งเตือน"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function formatNotificationTime(
  value: string,
): string {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "th-TH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}
