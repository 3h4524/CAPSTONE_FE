import { api } from "@/api/client";
import type { RunGroup, RunGroupSummary, SceneMockupOverride } from "@/types/video-workflow";

/** Batch video runs: one video per design confirmed at Mockup Approval. */
export const runGroupKeys = {
  detail: (id: string | null) => ["run-groups", id] as const,
  list: (workflowId: string | null) => ["run-groups", "workflow", workflowId] as const,
};

export const startRunGroup = async ({
  workflowId,
  revision,
  key,
  batchJobId,
}: {
  workflowId: string;
  revision: number;
  key: string;
  batchJobId?: string | null;
}) =>
  (
    await api.post<RunGroup>(`/api/workflows/${workflowId}/run-groups`, {
      expectedWorkflowRevision: revision,
      idempotencyKey: key,
      batchJobId: batchJobId ?? null,
    })
  ).data;

export const getRunGroup = async (id: string) => (await api.get<RunGroup>(`/api/run-groups/${id}`)).data;

export const listRunGroups = async (workflowId: string) =>
  (await api.get<RunGroupSummary[]>(`/api/workflows/${workflowId}/run-groups`)).data;

export const updateRunGroupOverride = async ({
  groupId,
  expectedRevision,
  productId,
  artworkGroupKey,
  scenes,
}: {
  groupId: string;
  expectedRevision: number;
  productId: string;
  artworkGroupKey: string;
  scenes: SceneMockupOverride[] | null;
}) =>
  (
    await api.put<RunGroup>(`/api/run-groups/${groupId}/overrides`, {
      expectedRevision,
      productId,
      artworkGroupKey,
      scenes,
    })
  ).data;

export const confirmRunGroup = async ({ groupId, expectedRevision }: { groupId: string; expectedRevision: number }) =>
  (await api.post<RunGroup>(`/api/run-groups/${groupId}/confirm`, { expectedRevision })).data;

export const cancelRunGroup = async ({ groupId, expectedRevision }: { groupId: string; expectedRevision: number }) =>
  (await api.post<RunGroup>(`/api/run-groups/${groupId}/cancel`, { expectedRevision })).data;
