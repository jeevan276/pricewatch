import api from "../lib/api";

import type {
  Alert,
  AlertListResponse,
} from "../types/alert";

const ALERT_ENDPOINTS = {
  list: "/alerts/",
  unread: "/alerts/unread",
  markRead: (id: number) =>
    `/alerts/${id}/read`,
  markAllRead: "/alerts/read-all",
  delete: (id: number) =>
    `/alerts/${id}`,
} as const;

export const getAlerts =
  async (): Promise<AlertListResponse> => {
    const { data } =
      await api.get<AlertListResponse>(
        ALERT_ENDPOINTS.list,
      );

    return data;
  };

export const getUnreadAlerts =
  async (): Promise<Alert[]> => {
    const { data } =
      await api.get<AlertListResponse>(
        ALERT_ENDPOINTS.unread,
      );

    return data.alerts;
  };

export const markAlertAsRead = async (
  id: number,
): Promise<void> => {
  await api.patch(
    ALERT_ENDPOINTS.markRead(id),
  );
};

export const markAllAlertsAsRead =
  async (): Promise<void> => {
    await api.patch(
      ALERT_ENDPOINTS.markAllRead,
    );
  };

export const deleteAlert = async (
  id: number,
): Promise<void> => {
  await api.delete(
    ALERT_ENDPOINTS.delete(id),
  );
};