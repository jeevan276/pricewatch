import api from "../lib/api";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
} from "../types/auth";

const AUTH_ENDPOINTS = {
  register: "/auth/register",
  login: "/auth/login",
  me: "/auth/me",
} as const;

export const registerUser = async (
  data: RegisterRequest,
): Promise<User> => {
  const { data: user } = await api.post<User>(
    AUTH_ENDPOINTS.register,
    data,
  );

  return user;
};

export const loginUser = async (
  data: LoginRequest,
): Promise<LoginResponse> => {
  const { data: response } = await api.post<LoginResponse>(
    AUTH_ENDPOINTS.login,
    data,
  );

  return response;
};

export const getCurrentUser = async (): Promise<User> => {
  const { data: user } = await api.get<User>(
    AUTH_ENDPOINTS.me,
  );

  return user;
};