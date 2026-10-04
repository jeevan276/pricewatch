import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import api from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { clearAuth, setAuthData } from "../utills/auth";

const user = { id: 1, email: "test@example.com", created_at: "2026-01-01" };
const adapter = api.defaults.adapter;
const reject = (config: InternalAxiosRequestConfig, status: number) =>
  new AxiosError("Request rejected", "ERR_BAD_RESPONSE", config, undefined, { status, statusText: "Error", headers: {}, config, data: { detail: "Error" } });
beforeEach(() => { localStorage.clear(); setAuthData("old", user); });
afterEach(() => { api.defaults.adapter = adapter; cleanup(); localStorage.clear(); });

describe("session reliability", () => {
  it("keeps a newer sign-in when an old request returns 401", async () => {
    let fail!: () => void;
    api.defaults.adapter = ((config) => new Promise((_resolve, rejectPromise) => {
      fail = () => rejectPromise(reject(config, 401));
    })) as AxiosAdapter;
    const request = api.get("/products/").catch((e) => e);
    await new Promise((r) => setTimeout(r, 0));
    setAuthData("new", user);
    fail();
    await request;
    expect(localStorage.getItem("access_token")).toBe("new");
  });

  it("broadcasts an actual expired session to mounted components", async () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoggedIn).toBe(true);
    api.defaults.adapter = (async (config) => { throw reject(config, 401); }) as AxiosAdapter;
    await act(async () => { await api.get("/products/").catch(() => undefined); });
    expect(result.current.isLoggedIn).toBe(false);
  });

  it("does not sign out after a scraper failure or failed login", async () => {
    api.defaults.adapter = (async (config) => { throw reject(config, config.url === "/auth/login" ? 401 : 502); }) as AxiosAdapter;
    await api.post("/products/track", {}).catch(() => undefined);
    await api.post("/auth/login", {}).catch(() => undefined);
    expect(localStorage.getItem("access_token")).toBe("old");
  });

  it("sets a deadline and omits stale bearer tokens from login", async () => {
    let captured: InternalAxiosRequestConfig | undefined;
    api.defaults.adapter = (async (config) => {
      captured = config;
      return { data: {}, status: 200, statusText: "OK", headers: {}, config };
    }) as AxiosAdapter;
    await api.post("/auth/login", {});
    expect(captured?.headers.Authorization).toBeUndefined();
    expect(captured?.timeout).toBe(20_000);
  });

  it("synchronizes sign-in and sign-out without reloading", () => {
    clearAuth();
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoggedIn).toBe(false);
    act(() => setAuthData("new", user));
    expect(result.current.user?.id).toBe(1);
    act(() => clearAuth());
    expect(result.current.user).toBeNull();
  });
});
