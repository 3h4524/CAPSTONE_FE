import { api } from "@/api/client";
import type { ImageEvalUploadInput } from "@/schemas/image-eval";
import type {
  ImageEvalRunDetail,
  ImageEvalRunSummary,
  ImageQualityLiveFilter,
  ImageQualityLiveStats,
} from "@/types/admin-image-quality";

const BASE_PATH = "/api/admin/image-quality";

export const adminImageQualityKeys = {
  all: ["admin", "image-quality"] as const,
  runs: () => [...adminImageQualityKeys.all, "eval-runs"] as const,
  run: (id: string) => [...adminImageQualityKeys.all, "eval-runs", id] as const,
  live: (filter: ImageQualityLiveFilter) => [...adminImageQualityKeys.all, "live", filter] as const,
};

export const getAdminImageEvalRuns = async (): Promise<ImageEvalRunSummary[]> => {
  const { data } = await api.get<ImageEvalRunSummary[]>(`${BASE_PATH}/evaluations`);
  return data;
};

export const getAdminImageEvalRun = async (id: string): Promise<ImageEvalRunDetail> => {
  const { data } = await api.get<ImageEvalRunDetail>(
    `${BASE_PATH}/evaluations/${encodeURIComponent(id)}`
  );
  return data;
};

export const createAdminImageEvalRun = async (
  input: ImageEvalUploadInput
): Promise<ImageEvalRunSummary> => {
  const { data } = await api.post<ImageEvalRunSummary>(`${BASE_PATH}/evaluations`, input);
  return data;
};

export const deleteAdminImageEvalRun = async (id: string): Promise<void> => {
  await api.delete(`${BASE_PATH}/evaluations/${encodeURIComponent(id)}`);
};

export const getAdminImageQualityLive = async (
  filter: ImageQualityLiveFilter
): Promise<ImageQualityLiveStats> => {
  const params = new URLSearchParams();
  if (filter.fromUtc) params.append("fromUtc", filter.fromUtc);
  if (filter.toUtc) params.append("toUtc", filter.toUtc);
  const query = params.toString();

  const { data } = await api.get<ImageQualityLiveStats>(
    query ? `${BASE_PATH}/live?${query}` : `${BASE_PATH}/live`
  );
  return data;
};
