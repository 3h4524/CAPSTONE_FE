import { api } from "@/api/client";
import type { Allowances } from "@/types/allowance";

export const getAllowancesRequest = async (): Promise<Allowances> => {
  const { data } = await api.get<Allowances>("/api/allowances");
  return data;
};
