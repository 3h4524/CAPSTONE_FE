import { api } from "@/api/client";

export const verifyEmailRequest = async (token: string): Promise<void> => {
  await api.post("/api/auth/verify-email", { token });
};

export const resendVerificationEmailRequest = async (email: string): Promise<void> => {
  await api.post("/api/auth/resend-verification", { email });
};
