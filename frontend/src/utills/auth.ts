import type { User } from "../types/auth";

const ACCESS_TOKEN_KEY = "access_token";
const USER_KEY = "user";

export const AUTH_CHANGE_EVENT = "auth-change";

export interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
}

export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getStoredUser = (): User | null => {
  const storedUser = localStorage.getItem(USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as User;
  } catch {
    return null;
  }
};

export const getStoredAuth = (): AuthState => {
  const token = getAccessToken();

  return {
    isLoggedIn: Boolean(token),
    user: token ? getStoredUser() : null,
  };
};

export const setAuthData = (
  accessToken: string,
  user: User,
): void => {
  localStorage.setItem(
    ACCESS_TOKEN_KEY,
    accessToken,
  );

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user),
  );

  window.dispatchEvent(
    new Event(AUTH_CHANGE_EVENT),
  );
};

export const clearAuth = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  window.dispatchEvent(
    new Event(AUTH_CHANGE_EVENT),
  );
};