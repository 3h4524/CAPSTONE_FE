import { api } from "@/api/client";
import type { AuthenticatedUser, LoginResult, RegisterResult } from "@/types/auth";

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

export const googleLoginRequest = async (idToken: string): Promise<LoginResult> => {
  const { data } = await api.post<LoginResult>("/api/auth/google", { idToken });
  return data;
};

export const forgotPasswordRequest = async (email: string): Promise<void> => {
  await api.post("/api/auth/forgot-password", { email });
};

export type ResetPasswordPayload = {
  token: string;
  newPassword: string;
};

export const resetPasswordRequest = async (payload: ResetPasswordPayload): Promise<void> => {
  await api.post("/api/auth/reset-password", payload);
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export const changePasswordRequest = async (payload: ChangePasswordPayload): Promise<void> => {
  await api.post("/api/auth/change-password", payload);
};

export const getCurrentUserRequest = async (): Promise<AuthenticatedUser> => {
  const { data } = await api.get<AuthenticatedUser>("/api/auth/me");
  return data;
};
