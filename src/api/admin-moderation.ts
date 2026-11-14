import { api } from "@/api/client";
import type {
  ModerationAllowlistItem,
  ModerationCheckDetail,
  ModerationCheckFilter,
  ModerationCheckListItem,
  ModerationOffender,
  ModerationOverview,
  ModerationRangeDays,
  ModerationSettings,
  ModerationTerm,
  ModerationTermFilter,
  PagedResult,
  SaveModerationAllowlistInput,
  SaveModerationTermInput,
  UpdateModerationSettingsInput,
} from "@/types/admin-moderation";

const BASE_PATH = "/api/admin/moderation";

export const adminModerationKeys = {
  all: ["admin", "moderation"] as const,
  overview: (days: ModerationRangeDays) => [...adminModerationKeys.all, "overview", days] as const,
  offenders: (days: ModerationRangeDays) => [...adminModerationKeys.all, "offenders", days] as const,
  checks: (filter: ModerationCheckFilter) => [...adminModerationKeys.all, "checks", filter] as const,
  check: (id: string) => [...adminModerationKeys.all, "check", id] as const,
  terms: (filter: ModerationTermFilter) => [...adminModerationKeys.all, "terms", filter] as const,
  allTerms: () => [...adminModerationKeys.all, "terms"] as const,
  allowlist: () => [...adminModerationKeys.all, "allowlist"] as const,
  settings: () => [...adminModerationKeys.all, "settings"] as const,
};

// Drops empty filters so the query string carries only what was chosen.
const params = <T extends Record<string, unknown>>(values: T) =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== ""));

export const getModerationOverview = async (days: ModerationRangeDays): Promise<ModerationOverview> =>
  (await api.get<ModerationOverview>(`${BASE_PATH}/overview`, { params: { days } })).data;

export const getModerationOffenders = async (days: ModerationRangeDays, limit = 10): Promise<ModerationOffender[]> =>
  (await api.get<ModerationOffender[]>(`${BASE_PATH}/offenders`, { params: { days, limit } })).data;

export const getModerationChecks = async (
  filter: ModerationCheckFilter
): Promise<PagedResult<ModerationCheckListItem>> =>
  (await api.get<PagedResult<ModerationCheckListItem>>(`${BASE_PATH}/checks`, { params: params(filter) })).data;

export const getModerationCheck = async (id: string): Promise<ModerationCheckDetail> =>
  (await api.get<ModerationCheckDetail>(`${BASE_PATH}/checks/${encodeURIComponent(id)}`)).data;

export const getModerationTerms = async (filter: ModerationTermFilter): Promise<ModerationTerm[]> =>
  (await api.get<ModerationTerm[]>(`${BASE_PATH}/terms`, { params: params(filter) })).data;

export const createModerationTerm = async (input: SaveModerationTermInput): Promise<ModerationTerm> =>
  (await api.post<ModerationTerm>(`${BASE_PATH}/terms`, input)).data;

export const updateModerationTerm = async ({
  id,
  input,
}: {
  id: string;
  input: SaveModerationTermInput;
}): Promise<ModerationTerm> =>
  (await api.put<ModerationTerm>(`${BASE_PATH}/terms/${encodeURIComponent(id)}`, input)).data;

export const deleteModerationTerm = async (id: string): Promise<void> => {
  await api.delete(`${BASE_PATH}/terms/${encodeURIComponent(id)}`);
};

export const getModerationAllowlist = async (): Promise<ModerationAllowlistItem[]> =>
  (await api.get<ModerationAllowlistItem[]>(`${BASE_PATH}/allowlist`)).data;

export const createModerationAllowlist = async (input: SaveModerationAllowlistInput): Promise<ModerationAllowlistItem> =>
  (await api.post<ModerationAllowlistItem>(`${BASE_PATH}/allowlist`, input)).data;

export const updateModerationAllowlist = async ({
  id,
  input,
}: {
  id: string;
  input: SaveModerationAllowlistInput;
}): Promise<ModerationAllowlistItem> =>
  (await api.put<ModerationAllowlistItem>(`${BASE_PATH}/allowlist/${encodeURIComponent(id)}`, input)).data;

export const deleteModerationAllowlist = async (id: string): Promise<void> => {
  await api.delete(`${BASE_PATH}/allowlist/${encodeURIComponent(id)}`);
};

export const getModerationSettings = async (): Promise<ModerationSettings> =>
  (await api.get<ModerationSettings>(`${BASE_PATH}/settings`)).data;

export const updateModerationSettings = async (input: UpdateModerationSettingsInput): Promise<ModerationSettings> =>
  (await api.put<ModerationSettings>(`${BASE_PATH}/settings`, input)).data;
