import { api } from "@/api/client";
import type { MockupMetadataFormValues } from "@/schemas/video-workflow";
import type { GenerateVideoConfig, MockupAsset, PromoVideo, RunAction, VideoStoryboard, VideoTemplateCatalogItem, WorkflowCapabilities, WorkflowRun } from "@/types/video-workflow";

export const videoWorkflowKeys = {
  capabilities: () => ["workflow-capabilities"] as const,
  templates: () => ["video-templates"] as const,
  run: (id: string | null) => ["workflow-runs", id] as const,
  assets: (id: string) => ["mockup-assets", id] as const,
  videos: (id: string | null) => ["workflow-videos", id] as const,
};
export const getWorkflowCapabilities = async () => (await api.get<WorkflowCapabilities>("/api/workflows/capabilities")).data;
export const listVideoTemplates = async () => (await api.get<VideoTemplateCatalogItem[]>("/api/workflows/video-templates")).data;
export const startWorkflowRun = async ({ workflowId, revision, key }: { workflowId: string; revision: number; key: string }) => (await api.post<WorkflowRun>(`/api/workflows/${workflowId}/runs`, { expectedWorkflowRevision: revision, idempotencyKey: key })).data;
export const getWorkflowRun = async (id: string) => (await api.get<WorkflowRun>(`/api/workflow-runs/${id}`)).data;
export const actOnWorkflowRun = async ({ runId, ...action }: RunAction & { runId: string }) => (await api.post<WorkflowRun>(`/api/workflow-runs/${runId}/actions`, action)).data;
export const listMockupAssets = async (id: string) => (await api.get<MockupAsset[]>(`/api/products/${id}/mockup-assets`)).data;
export const uploadMockupAsset = async ({ productId, file }: { productId: string; file: File }) => (await api.postForm<MockupAsset>(`/api/products/${productId}/mockup-assets`, { file })).data;
export const updateMockupAsset = async ({ id, expectedRevision, ...values }: MockupMetadataFormValues & { id: string; expectedRevision: number }) => (await api.put<MockupAsset>(`/api/mockup-assets/${id}`, { ...values, expectedRevision })).data;
export const reviewMockupAsset = async ({ id, revision, approved }: { id: string; revision: number; approved: boolean }) => (await api.post<MockupAsset>(`/api/mockup-assets/${id}/review`, { expectedRevision: revision, approved })).data;
export const listRunVideos = async (id: string) => (await api.get<PromoVideo[]>(`/api/workflow-runs/${id}/videos`)).data;
export const mediaDownload = async ({ id, zip }: { id: string; zip: boolean }) => (await api.get<string>(`/api/${zip ? "video-exports" : "promo-videos"}/${id}/download`)).data;
export const previewVideoStoryboard = async ({ productId, ...request }: { productId: string; config: GenerateVideoConfig; mockupIds: string[]; artworkGroupKey: string }) => (await api.post<VideoStoryboard>(`/api/products/${productId}/video-storyboard`, request)).data;
