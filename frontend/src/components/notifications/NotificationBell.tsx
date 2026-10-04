import { Bell, Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  getAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
} from "../../api/alertApi";

import { getAccessToken } from "../../utills/auth";
import type { Alert } from "../../types/alert";

import NotificationDropdown from "./NotificationDropdown";

const POLLING_INTERVAL = 30_000;

const NotificationBell = () => {
  const navigate = useNavigate();

  const containerRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const unreadCount = alerts.filter((alert) => alert.is_read === 0).length;
  const requests = useRef(0);
  const actionPending = useRef(false);

  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // ============================================================
  // LOAD ALERTS
  // ============================================================

  const loadAlerts = useCallback(
    async (showLoader = false) => {
      if (actionPending.current) return;
      const token = getAccessToken();
      const requestId = ++requests.current;
      try {
        if (showLoader) {
          setLoading(true);
        }

        const response = await getAlerts();

        if (token === getAccessToken() && requestId === requests.current) setAlerts(response.alerts);
      } catch (error) {
        console.error(
          "Failed to load notifications:",
          error,
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [],
  );

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAlerts(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAlerts]);

  // ============================================================
  // POLLING
  // ============================================================

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadAlerts(false);
    }, POLLING_INTERVAL);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadAlerts]);

  // ============================================================
  // CLOSE WHEN CLICKING OUTSIDE
  // ============================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  // ============================================================
  // TOGGLE DROPDOWN
  // ============================================================

  const handleToggle = () => {
    setOpen((current) => !current);
  };

  // ============================================================
  // MARK ONE ALERT AS READ
  // ============================================================

  const handleRead = async (id: number) => {
    const alert = alerts.find(
      (item) => item.id === id,
    );

    if (actionPending.current || !alert || alert.is_read === 1) {
      return;
    }

    actionPending.current = true;
    ++requests.current;
    try {
      setLoadingAction(true);

      await markAlertAsRead(id);

      setAlerts((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                is_read: 1,
              }
            : item,
        ),
      );


    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error,
      );
    } finally {
      actionPending.current = false;
      setLoadingAction(false);
    }
  };

  // ============================================================
  // MARK ALL ALERTS AS READ
  // ============================================================

  const handleReadAll = async () => {
    if (actionPending.current || unreadCount === 0) {
      return;
    }

    actionPending.current = true;
    ++requests.current;
    try {
      setLoadingAction(true);

      await markAllAlertsAsRead();

      setAlerts((current) =>
        current.map((alert) => ({
          ...alert,
          is_read: 1,
        })),
      );


    } catch (error) {
      console.error(
        "Failed to mark all notifications as read:",
        error,
      );
    } finally {
      actionPending.current = false;
      setLoadingAction(false);
    }
  };

  // ============================================================
  // OPEN PRODUCT FROM ALERT
  // ============================================================

  const handleOpen = async (alert: Alert) => {
    if (alert.is_read === 0) {
      await handleRead(alert.id);
    }

    setOpen(false);

    navigate(`/product/${alert.product_id}`);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="menu"
        className="
          relative flex h-10 w-10 items-center justify-center
          rounded-xl
          text-slate-600
          transition
          hover:bg-slate-100
          hover:text-red-600
          focus:outline-none
          focus:ring-2
          focus:ring-red-500/30
          dark:text-slate-300
          dark:hover:bg-slate-800
          dark:hover:text-red-400
        "
      >
        {loading && !open ? (
          <Loader2
            size={20}
            className="animate-spin"
            aria-hidden="true"
          />
        ) : (
          <Bell
            size={20}
            aria-hidden="true"
          />
        )}

        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread notifications`}
            className="
              absolute -right-0.5 -top-0.5
              flex min-h-5 min-w-5
              items-center justify-center
              rounded-full
              bg-red-600
              px-1
              text-[10px]
              font-bold
              text-white
              ring-2
              ring-white
              dark:ring-slate-900
            "
          >
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          alerts={alerts}
          loading={
            loading || loadingAction
          }
          unreadCount={unreadCount}
          onRead={handleRead}
          onReadAll={handleReadAll}
          onOpen={handleOpen}
        />
      )}
    </div>
  );
};

export default NotificationBell;