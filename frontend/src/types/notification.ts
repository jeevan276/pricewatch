export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionRequest {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface VapidPublicKeyResponse {
  public_key: string;
}

export interface NotificationResponse {
  message: string;
}