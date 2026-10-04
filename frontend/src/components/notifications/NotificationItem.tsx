import {
  Bell,
  Check,
  ExternalLink,
} from "lucide-react";

import type { Alert } from "../../types/alert";

interface NotificationItemProps {
  alert: Alert;
  onRead: (id: number) => void;
  onOpen: (alert: Alert) => void;
}

const NotificationItem = ({
  alert,
  onRead,
  onOpen,
}: NotificationItemProps) => {
  const isUnread = alert.is_read === 0;

  const formattedDate = new Date(
    alert.created_at,
  ).toLocaleString();

  return (
    <div
      className={`
        group border-b border-slate-100 p-4
        transition
        dark:border-slate-800

        ${
          isUnread
            ? `
              bg-red-50/60
              hover:bg-red-50
              dark:bg-red-950/20
              dark:hover:bg-red-950/30
            `
            : `
              bg-white
              hover:bg-slate-50
              dark:bg-slate-900
              dark:hover:bg-slate-800
            `
        }
      `}
    >
      <div className="flex gap-3">
        {/* Notification Icon */}
        <div
          className={`
            flex h-9 w-9 shrink-0
            items-center justify-center
            rounded-full

            ${
              isUnread
                ? `
                  bg-red-100 text-red-600
                  dark:bg-red-950/60
                  dark:text-red-400
                `
                : `
                  bg-slate-100 text-slate-500
                  dark:bg-slate-800
                  dark:text-slate-400
                `
            }
          `}
        >
          <Bell size={17} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Notification Content */}
          <button
            type="button"
            onClick={() => onOpen(alert)}
            className="
              w-full text-left
              focus:outline-none
            "
          >
            <div className="flex items-start justify-between gap-2">
              <p
                className={`
                  text-sm
                  ${
                    isUnread
                      ? `
                        font-semibold
                        text-slate-900
                        dark:text-white
                      `
                      : `
                        font-medium
                        text-slate-700
                        dark:text-slate-200
                      `
                  }
                `}
              >
                Price Drop
              </p>

              {isUnread && (
                <span
                  aria-label="Unread notification"
                  className="
                    mt-1 h-2 w-2 shrink-0
                    rounded-full
                    bg-red-500
                    dark:bg-red-400
                  "
                />
              )}
            </div>

            <p
              className="
                mt-1 text-sm leading-5
                text-slate-600
                dark:text-slate-400
              "
            >
              {alert.message}
            </p>

            <p
              className="
                mt-2 text-xs
                text-slate-400
                dark:text-slate-500
              "
            >
              {formattedDate}
            </p>
          </button>

          {/* Actions */}
          <div className="flex items-center">
            {isUnread && (
              <button
                type="button"
                onClick={() => onRead(alert.id)}
                className="
                  mt-2 inline-flex
                  items-center gap-1
                  text-xs font-medium
                  text-red-600
                  transition
                  hover:text-red-700
                  dark:text-red-400
                  dark:hover:text-red-300
                "
              >
                <Check size={13} />
                Mark as read
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpen(alert)}
              className={`
                mt-2 inline-flex
                items-center gap-1
                text-xs font-medium
                text-slate-500
                transition
                hover:text-slate-700
                dark:text-slate-400
                dark:hover:text-slate-200
                ${isUnread ? "ml-4" : ""}
              `}
            >
              View product
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;