export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export type RegisterRequest = AuthCredentials;

export type LoginRequest = AuthCredentials;

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
}