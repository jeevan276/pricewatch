import axios from "axios";
import { useAuth } from "./useAuth";
import { getAccessToken } from "../utills/auth";
import { useCallback, useEffect, useState } from "react";

import {
  getVapidPublicKey,
  getPushSubscriptions,
  subscribeToPush,
  unsubscribeFromPush,
} from "../api/notificationApi";

// ============================================================
// CONSTANTS
// ============================================================

const SERVICE_WORKER_PATH = "/sw.js";

// ============================================================
// VAPID KEY → ARRAY BUFFER
// ============================================================

const urlBase64ToArrayBuffer = (
  base64String: string,
): ArrayBuffer => {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4,
  );

  const base64 = (
    base64String + padding
  )
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  const bytes = new Uint8Array(
    rawData.length,
  );

  for (
    let index = 0;
    index < rawData.length;
    index += 1
  ) {
    bytes[index] =
      rawData.charCodeAt(index);
  }

  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
};

// ============================================================
// BROWSER SUPPORT
// ============================================================

const isPushSupported = (): boolean => {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
};

// ============================================================
// PUSH NOTIFICATION HOOK
// ============================================================

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [enabled, setEnabled] = useState(false);

  // ==========================================================
  // CHECK EXISTING SUBSCRIPTION
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const checkSubscription = async () => {
      if (!isPushSupported()) {
        return;
      }

      try {
        const registration =
          await navigator.serviceWorker.register(
            SERVICE_WORKER_PATH,
          );

        const subscription =
          await registration.pushManager.getSubscription();

        const saved = subscription ? await getPushSubscriptions() : [];
        if (!cancelled) {
          setEnabled(Boolean(subscription && saved.some((item) => item.endpoint === subscription.endpoint)));
        }
      } catch (err) {
        console.error(
          "Failed to check push subscription:",
          err,
        );
      }
    };

    void checkSubscription();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // ==========================================================
  // ENABLE NOTIFICATIONS
  // ==========================================================

  const enableNotifications =
    useCallback(async (): Promise<boolean> => {
      const token = getAccessToken();
      try {
        setLoading(true);
        setError(null);

        // ------------------------------------------------------
        // CHECK SUPPORT
        // ------------------------------------------------------

        if (!isPushSupported()) {
          throw new Error(
            "Web Push notifications are not supported by this browser.",
          );
        }

        // ------------------------------------------------------
        // REQUEST PERMISSION
        // ------------------------------------------------------

        const permission =
          await Notification.requestPermission();

        if (permission !== "granted") {
          throw new Error(
            "Notification permission was not granted.",
          );
        }

        // ------------------------------------------------------
        // REGISTER SERVICE WORKER
        // ------------------------------------------------------

        const registration =
          await navigator.serviceWorker.register(
            SERVICE_WORKER_PATH,
          );

        await navigator.serviceWorker.ready;

        // ------------------------------------------------------
        // CHECK EXISTING SUBSCRIPTION
        // ------------------------------------------------------

        let subscription =
          await registration.pushManager.getSubscription();

        // ------------------------------------------------------
        // CREATE NEW SUBSCRIPTION
        // ------------------------------------------------------

        if (!subscription) {
          const publicKey =
            await getVapidPublicKey();

          const applicationServerKey =
            urlBase64ToArrayBuffer(
              publicKey,
            );

          subscription =
            await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey,
            });
        }

        // ------------------------------------------------------
        // SAVE TO BACKEND
        // ------------------------------------------------------

        if (token !== getAccessToken()) throw new Error("Your account changed. Please enable notifications again.");
        try {
          await subscribeToPush(subscription);
        } catch (err) {
          if (!axios.isAxiosError(err) || err.response?.status !== 409) throw err;
          // A shared browser may still have the previous account's endpoint.
          // Replace the browser subscription instead of taking over its DB row.
          await subscription.unsubscribe();
          const publicKey = await getVapidPublicKey();
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true, applicationServerKey: urlBase64ToArrayBuffer(publicKey),
          });
          if (token !== getAccessToken()) throw new Error("Your account changed. Please try again.", { cause: err });
          await subscribeToPush(subscription);
        }

        setEnabled(true);

        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to enable notifications.";

        console.error(
          "Notification enable error:",
          err,
        );

        setError(message);
        setEnabled(false);

        return false;
      } finally {
        setLoading(false);
      }
    }, []);

  // ==========================================================
  // DISABLE NOTIFICATIONS
  // ==========================================================

  const disableNotifications =
    useCallback(async (): Promise<boolean> => {
      const token = getAccessToken();
      try {
        setLoading(true);
        setError(null);

        if (!isPushSupported()) {
          setEnabled(false);
          return true;
        }

        const registration =
          await navigator.serviceWorker.getRegistration(
            SERVICE_WORKER_PATH,
          );

        if (!registration) {
          setEnabled(false);
          return true;
        }

        const subscription =
          await registration.pushManager.getSubscription();

        if (!subscription) {
          setEnabled(false);
          return true;
        }

        // ------------------------------------------------------
        // REMOVE FROM BACKEND
        // ------------------------------------------------------

        if (token !== getAccessToken()) throw new Error("Your account changed. Please try again.");
        try {
          await unsubscribeFromPush(subscription.endpoint);
        } catch (err) {
          // A deleted/foreign server row must not prevent local unsubscribe.
          if (!axios.isAxiosError(err) || ![403, 404].includes(err.response?.status ?? 0)) throw err;
        }

        // ------------------------------------------------------
        // REMOVE FROM BROWSER
        // ------------------------------------------------------

        await subscription.unsubscribe();

        setEnabled(false);

        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to disable notifications.";

        console.error(
          "Notification disable error:",
          err,
        );

        setError(message);

        return false;
      } finally {
        setLoading(false);
      }
    }, []);

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    enabled,
    loading,
    error,
    enableNotifications,
    disableNotifications,
  };
};

