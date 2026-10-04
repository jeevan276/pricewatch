import api from "../lib/api";

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionRequest {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

interface VapidPublicKeyResponse {
  public_key: string;
}

interface NotificationResponse {
  message: string;
}

// ============================================================
// GET VAPID PUBLIC KEY
// ============================================================

export const getVapidPublicKey =
  async (): Promise<string> => {
    const { data } =
      await api.get<VapidPublicKeyResponse>(
        "/notifications/public-key",
      );

    return data.public_key;
  };

// ============================================================
// SAVE PUSH SUBSCRIPTION
// ============================================================

export const subscribeToPush = async (
  subscription: PushSubscription,
): Promise<NotificationResponse> => {
  const request: PushSubscriptionRequest = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64(
        subscription.getKey("p256dh"),
      ),
      auth: arrayBufferToBase64(
        subscription.getKey("auth"),
      ),
    },
  };

  const { data } =
    await api.post<NotificationResponse>(
      "/notifications/subscribe",
      request,
    );

  return data;
};

// ============================================================
// REMOVE PUSH SUBSCRIPTION
// ============================================================

export const unsubscribeFromPush = async (
  endpoint: string,
): Promise<NotificationResponse> => {
  const { data } =
    await api.delete<NotificationResponse>(
      "/notifications/unsubscribe",
      {
        params: {
          endpoint,
        },
      },
    );

  return data;
};

// ============================================================
// ARRAY BUFFER → BASE64
// ============================================================

const arrayBufferToBase64 = (
  buffer: ArrayBuffer | null,
): string => {
  if (!buffer) {
    throw new Error(
      "Push subscription key is missing.",
    );
  }

  const bytes = new Uint8Array(buffer);

  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary);
};
export interface SavedPushSubscription {
  id: number;
  endpoint: string;
}
export const getPushSubscriptions = async (): Promise<SavedPushSubscription[]> => {
  const { data } = await api.get<{ subscriptions: SavedPushSubscription[] }>("/notifications/subscriptions");
  return data.subscriptions;
};
