import { api } from "@/api/client";
import type {
  BatchJobDetail,
  BatchJobSummary,
  ImageApprovalResult,
  ImageApprovalStatus,
  StartBatchJobInput,
  StartBatchJobResult,
} from "@/types/batch-jobs";

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

// Stops a queued or running job after the product being generated; the rest are failed as cancelled.
export const cancelBatchJob = async (batchJobId: string): Promise<void> => {
  await api.post(`/api/batch-jobs/${batchJobId}/cancel`);
};

// Approves or rejects generated designs of a finished job. Without ids it changes every image still
// pending, so "approve all" never overrides one that was rejected.
export const setDesignImageApproval = async (
  batchJobId: string,
  designImageIds: string[] | null,
  status: ImageApprovalStatus
): Promise<ImageApprovalResult> =>
  (await api.put<ImageApprovalResult>(`/api/batch-jobs/${batchJobId}/design-images/approval`, { designImageIds, status })).data;
