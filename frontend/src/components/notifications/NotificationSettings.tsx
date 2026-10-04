import {
  Bell,
  BellOff,
  Loader2,
} from "lucide-react";

import { usePushNotifications } from "../../hooks/usePushNotifications";

const NotificationSettings = () => {
  const {
    enabled,
    loading,
    error,
    enableNotifications,
    disableNotifications,
  } = usePushNotifications();

  const handleToggle = async () => {
    if (loading) {
      return;
    }

    if (enabled) {
      await disableNotifications();
      return;
    }

    await enableNotifications();
  };

  return (
    <section
      className="
        rounded-2xl
        border border-slate-200
        bg-white
        p-5
        shadow-sm
        dark:border-slate-700
        dark:bg-slate-900
      "
    >
      <div className="flex items-start justify-between gap-4">
        {/* ==================================================
            INFORMATION
        ================================================== */}

        <div className="flex min-w-0 gap-4">
          {/* Icon */}
          <div
            className={`
              flex h-11 w-11 shrink-0
              items-center justify-center
              rounded-xl

              ${
                enabled
                  ? `
                    bg-green-100 text-green-600
                    dark:bg-green-950/50
                    dark:text-green-400
                  `
                  : `
                    bg-slate-100 text-slate-600
                    dark:bg-slate-800
                    dark:text-slate-400
                  `
              }
            `}
          >
            {enabled ? (
              <Bell size={21} />
            ) : (
              <BellOff size={21} />
            )}
          </div>

          {/* Text */}
          <div className="min-w-0">
            <h3
              className="
                font-semibold
                text-slate-900
                dark:text-white
              "
            >
              Price Drop Notifications
            </h3>

            <p
              className="
                mt-1 max-w-lg
                text-sm leading-5
                text-slate-500
                dark:text-slate-400
              "
            >
              Get notified when one of your tracked
              products becomes cheaper.
            </p>

            {/* Status */}
            <div
              className="
                mt-2 flex
                items-center gap-2
                text-xs font-medium
              "
            >
              <span
                className={`
                  h-2 w-2 rounded-full
                  ${
                    enabled
                      ? "bg-green-500 dark:bg-green-400"
                      : "bg-slate-300 dark:bg-slate-600"
                  }
                `}
              />

              <span
                className={
                  enabled
                    ? "text-green-600 dark:text-green-400"
                    : "text-slate-500 dark:text-slate-400"
                }
              >
                {enabled
                  ? "Notifications enabled"
                  : "Notifications disabled"}
              </span>
            </div>
          </div>
        </div>

        {/* ==================================================
            TOGGLE BUTTON
        ================================================== */}

        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          aria-pressed={enabled}
          className={`
            flex min-w-24 shrink-0
            items-center justify-center
            gap-2 rounded-xl
            px-4 py-2
            text-sm font-semibold
            transition
            disabled:cursor-not-allowed
            disabled:opacity-60

            ${
              enabled
                ? `
                  bg-slate-100
                  text-slate-700
                  hover:bg-red-50
                  hover:text-red-600
                  dark:bg-slate-800
                  dark:text-slate-200
                  dark:hover:bg-red-950/40
                  dark:hover:text-red-400
                `
                : `
                  bg-red-600
                  text-white
                  hover:bg-red-700
                  dark:bg-red-600
                  dark:hover:bg-red-500
                `
            }
          `}
        >
          {loading && (
            <Loader2
              size={16}
              className="animate-spin"
              aria-hidden="true"
            />
          )}

          {loading
            ? "Please wait..."
            : enabled
              ? "Disable"
              : "Enable"}
        </button>
      </div>

      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (
        <div
          role="alert"
          className="
            mt-4 rounded-xl
            border border-red-200
            bg-red-50
            px-4 py-3
            text-sm text-red-600
            dark:border-red-900/60
            dark:bg-red-950/30
            dark:text-red-400
          "
        >
          {error}
        </div>
      )}
    </section>
  );
};

export default NotificationSettings;