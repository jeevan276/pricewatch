import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { getPushSubscriptions, getVapidPublicKey, subscribeToPush, unsubscribeFromPush } from "../api/notificationApi";
import { setAuthData } from "../utills/auth";
vi.mock("../api/notificationApi", () => ({ getPushSubscriptions: vi.fn(), getVapidPublicKey: vi.fn(), subscribeToPush: vi.fn(), unsubscribeFromPush: vi.fn() }));
const oldSubscription = { endpoint: "https://fcm.googleapis.com/send/old", unsubscribe: vi.fn().mockResolvedValue(true) };
const newSubscription = { endpoint: "https://fcm.googleapis.com/send/new", unsubscribe: vi.fn().mockResolvedValue(true) };
const registration = { pushManager: { getSubscription: vi.fn(), subscribe: vi.fn() } };
beforeEach(() => {
  vi.resetAllMocks();
  setAuthData("token", { id: 1, email: "test@example.com", created_at: "2026-01-01" });
  oldSubscription.unsubscribe.mockResolvedValue(true);
  newSubscription.unsubscribe.mockResolvedValue(true);
  registration.pushManager.getSubscription.mockResolvedValue(oldSubscription);
  registration.pushManager.subscribe.mockResolvedValue(newSubscription);
  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("Notification", { requestPermission: vi.fn().mockResolvedValue("granted") });
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: {
    register: vi.fn().mockResolvedValue(registration), getRegistration: vi.fn().mockResolvedValue(registration), ready: Promise.resolve(registration),
  } });
  vi.mocked(getPushSubscriptions).mockResolvedValue([]);
  vi.mocked(getVapidPublicKey).mockResolvedValue("AQID");
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });
const conflict = (status: number) => Object.assign(new AxiosError("Rejected"), { response: { status } });

it("does not show enabled merely because a browser endpoint exists", async () => {
  const { result } = renderHook(() => usePushNotifications());
  await waitFor(() => expect(getPushSubscriptions).toHaveBeenCalled());
  expect(result.current.enabled).toBe(false);
});

it("rotates an old-account endpoint on conflict instead of taking ownership", async () => {
  vi.mocked(subscribeToPush).mockRejectedValueOnce(conflict(409)).mockResolvedValueOnce({ message: "Saved" });
  const { result } = renderHook(() => usePushNotifications());
  await waitFor(() => expect(getPushSubscriptions).toHaveBeenCalled());
  await act(async () => { expect(await result.current.enableNotifications()).toBe(true); });
  expect(oldSubscription.unsubscribe).toHaveBeenCalledOnce();
  expect(subscribeToPush).toHaveBeenLastCalledWith(newSubscription);
  expect(result.current.enabled).toBe(true);
});

it("can disable a browser subscription whose server row was already deleted", async () => {
  vi.mocked(unsubscribeFromPush).mockRejectedValue(conflict(404));
  const { result } = renderHook(() => usePushNotifications());
  await waitFor(() => expect(getPushSubscriptions).toHaveBeenCalled());
  await act(async () => { expect(await result.current.disableNotifications()).toBe(true); });
  expect(oldSubscription.unsubscribe).toHaveBeenCalledOnce();
  expect(result.current.enabled).toBe(false);
});
