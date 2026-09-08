import { api } from "@/api/client";
import type { RegisterResult } from "@/types/auth";

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
