import { api } from "@/api/client";
import type { RegisterResult, LoginResult } from "@/types/auth";

export type RegisterPayload = {
  email: string;
  password: string;
  fullName?: string;
};

export const registerRequest = async (payload: RegisterPayload): Promise<RegisterResult> => {
  const { data } = await api.post<RegisterResult>("/api/auth/register", payload);
  return data;
};

export const verifyEmailRequest = async (token: string): Promise<void> => {
  await api.post("/api/auth/verify-email", { token });
};

export const resendVerificationEmailRequest = async (email: string): Promise<void> => {
  await api.post("/api/auth/resend-verification", { email });
};

export type LoginPayload = {
  email: string;
  password: string;
};

export const loginRequest = async (payload: LoginPayload): Promise<LoginResult> => {
  const { data } = await api.post<LoginResult>("/api/auth/login", payload);
  return data;
};
