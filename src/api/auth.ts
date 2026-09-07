import { api } from "@/api/client";
import type { LoginResult } from "@/types/auth";

export type LoginPayload = {
  email: string;
  password: string;
};

export const loginRequest = async (payload: LoginPayload): Promise<LoginResult> => {
  const { data } = await api.post<LoginResult>("/api/auth/login", payload);
  return data;
};
