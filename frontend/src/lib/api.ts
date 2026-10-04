import axios from "axios";
import { clearAuth, getAccessToken } from "../utills/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000",
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

const isAuthEndpoint = (url?: string) =>
  ["/auth/login", "/auth/register"].some((path) => url?.includes(path));

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  // Public authentication requests must not carry a stale token.
  if (token && !isAuthEndpoint(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    config.headers.delete("Authorization");
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;
    const status = error.response?.status;
    const sentToken = config?.headers?.Authorization;
    // A late 401 from an old session must not erase a newer sign-in.
    if (status === 401 && !isAuthEndpoint(config?.url) &&
        sentToken && sentToken === `Bearer ${getAccessToken()}`) {
      clearAuth();
    }
    return Promise.reject(error);
  },
);

// Begin waking a sleeping backend while the user fills the sign-in form.
// This cannot remove hosting cold starts, but avoids waiting until submission.
let warmup: Promise<void> | null = null;
export const warmBackend = (): Promise<void> => {
  warmup ??= api.get("/", { timeout: 10_000 })
    .then(() => undefined).catch(() => undefined)
    .finally(() => { warmup = null; });
  return warmup;
};

export default api;
