import { api } from "@/api/client";
import type { AiShotQuote, GenerateVideoConfig, RunCostEstimate, RunGroup, RunGroupSummary, SceneMockupOverride } from "@/types/video-workflow";

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
  aiBudgetUsd,
}: {
  workflowId: string;
  revision: number;
  key: string;
  batchJobId?: string | null;
  /** The AI video cost confirmed on Run: an automatic Mockup Approval starts the videos within it. */
  aiBudgetUsd?: number | null;
}) =>
  (
    await api.post<RunGroup>(`/api/workflows/${workflowId}/run-groups`, {
      expectedWorkflowRevision: revision,
      idempotencyKey: key,
      batchJobId: batchJobId ?? null,
      aiBudgetUsd: aiBudgetUsd ?? null,
    })
  ).data;

/** What a Run of the saved workflow is expected to cost, item by item. */
export const estimateWorkflowRun = async (workflowId: string) =>
  (await api.get<RunCostEstimate>(`/api/workflows/${workflowId}/run-estimate`)).data;

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

/** One design's own Generate Video settings before its video starts; null puts it back on the shared ones. */
export const updateRunGroupDesignConfig = async ({
  groupId,
  expectedRevision,
  productId,
  artworkGroupKey,
  config,
}: {
  groupId: string;
  expectedRevision: number;
  productId: string;
  artworkGroupKey: string;
  config: GenerateVideoConfig | null;
}) =>
  (
    await api.put<RunGroup>(`/api/run-groups/${groupId}/design-config`, {
      expectedRevision,
      productId,
      artworkGroupKey,
      config,
    })
  ).data;

/** What the AI clips of every design cost together, confirmed once before the videos start. */
export const quoteRunGroupAi = async ({ groupId, expectedRevision }: { groupId: string; expectedRevision: number }) =>
  (await api.post<AiShotQuote>(`/api/run-groups/${groupId}/ai-quote`, { expectedRevision })).data;

export const confirmRunGroup = async ({
  groupId,
  expectedRevision,
  aiShotQuoteToken,
}: {
  groupId: string;
  expectedRevision: number;
  aiShotQuoteToken?: string;
}) => (await api.post<RunGroup>(`/api/run-groups/${groupId}/confirm`, { expectedRevision, aiShotQuoteToken })).data;

export const cancelRunGroup = async ({ groupId, expectedRevision }: { groupId: string; expectedRevision: number }) =>
  (await api.post<RunGroup>(`/api/run-groups/${groupId}/cancel`, { expectedRevision })).data;
