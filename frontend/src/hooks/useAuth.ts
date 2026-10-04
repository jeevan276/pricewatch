import { useSyncExternalStore } from "react";
import { AUTH_CHANGE_EVENT, getStoredAuth } from "../utills/auth";
import type { AuthState } from "../utills/auth";

const subscribe = (onChange: () => void) => {
  window.addEventListener(AUTH_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};
// Primitive snapshots stay stable and let React detect sign-in during mounting.
const snapshot = () => `${localStorage.getItem("access_token") ?? ""}\n${localStorage.getItem("user") ?? ""}`;
export const useAuth = (): AuthState => {
  useSyncExternalStore(subscribe, snapshot);
  return getStoredAuth();
};
