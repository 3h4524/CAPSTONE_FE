import { api } from "@/api/client";
import type { BatchJobDetail, BatchJobSummary, StartBatchJobInput, StartBatchJobResult } from "@/types/batch-jobs";

export const batchJobKeys = {
  all: ["batch-jobs"] as const,
  detail: (id: string) => [...batchJobKeys.all, "detail", id] as const,
  byBatch: (batchId: string) => [...batchJobKeys.all, "batch", batchId] as const,
};

export const getBatchJob = async (batchJobId: string): Promise<BatchJobDetail> =>
  (await api.get<BatchJobDetail>(`/api/batch-jobs/${batchJobId}`)).data;

export const listBatchJobs = async (batchId: string): Promise<BatchJobSummary[]> =>
  (await api.get<BatchJobSummary[]>(`/api/batches/${batchId}/jobs`)).data;

export const startBatchJob = async ({ batchJobId, ...input }: StartBatchJobInput & { batchJobId: string }): Promise<StartBatchJobResult> =>
  (await api.post<StartBatchJobResult>(`/api/batch-jobs/${batchJobId}/start`, input)).data;

export const retryFailedBatchJob = async (batchJobId: string): Promise<StartBatchJobResult> =>
  (await api.post<StartBatchJobResult>(`/api/batch-jobs/${batchJobId}/retry-failed`)).data;
