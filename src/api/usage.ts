import { api } from "@/api/client";
import type { UsageOverview } from "@/types/usage";

export const getUsageOverview = async (days: number): Promise<UsageOverview> =>
  (await api.get<UsageOverview>(`/api/usage?days=${days}`)).data;
