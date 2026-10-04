import {
  BellOff,
  CheckCheck,
  Loader2,
} from "lucide-react";

import type { Alert } from "../../types/alert";
import NotificationItem from "./NotificationItem";

interface NotificationDropdownProps {
  alerts: Alert[];
  loading: boolean;
  unreadCount: number;
  onRead: (id: number) => void;
  onReadAll: () => void;
  onOpen: (alert: Alert) => void;
}

const NotificationDropdown = ({
  alerts,
  loading,
  unreadCount,
  onRead,
  onReadAll,
  onOpen,
}: NotificationDropdownProps) => {
  return (
    <div
      className="
        absolute right-0 top-12 z-50
        w-[min(380px,calc(100vw-2rem))]
        overflow-hidden rounded-2xl
        border border-slate-200
        bg-white
        shadow-xl
        dark:border-slate-700
        dark:bg-slate-900
      "
    >
      {/* Header */}
      <div
        className="
          flex items-center justify-between
          border-b border-slate-200
          px-4 py-3
          dark:border-slate-700
        "
      >
        <div>
          <h3
            className="
              text-sm font-semibold
              text-slate-900
              dark:text-white
            "
          >
            Notifications
          </h3>

          <p
            className="
              text-xs text-slate-500
              dark:text-slate-400
            "
          >
            {unreadCount > 0
              ? `${unreadCount} unread notification${
                  unreadCount === 1 ? "" : "s"
                }`
              : "You're all caught up"}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onReadAll}
            className="
              inline-flex items-center gap-1
              rounded-lg px-2 py-1.5
              text-xs font-medium
              text-red-600
              transition
              hover:bg-red-50
              dark:text-red-400
              dark:hover:bg-red-950/40
            "
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <div
            className="
              flex items-center justify-center
              px-4 py-10
            "
          >
            <Loader2
              size={22}
              className="
                animate-spin
                text-red-500
                dark:text-red-400
              "
            />
          </div>
        ) : alerts.length === 0 ? (
          <div
            className="
              flex flex-col items-center
              justify-center
              px-6 py-12
              text-center
            "
          >
            <div
              className="
                flex h-12 w-12
                items-center justify-center
                rounded-full
                bg-slate-100
                dark:bg-slate-800
              "
            >
              <BellOff
                size={22}
                className="
                  text-slate-400
                  dark:text-slate-500
                "
              />
            </div>

            <p
              className="
                mt-3 text-sm font-medium
                text-slate-700
                dark:text-slate-200
              "
            >
              No notifications
            </p>

            <p
              className="
                mt-1 text-xs
                text-slate-400
                dark:text-slate-500
              "
            >
              Price drop alerts will appear here.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <NotificationItem
              key={alert.id}
              alert={alert}
              onRead={onRead}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;