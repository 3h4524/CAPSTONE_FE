import axios from "axios";

import { api } from "@/api/client";
import type { MockupMetadataFormValues } from "@/schemas/video-workflow";
import type { AiSceneVideo, AiShotQuote, AiStudioFrameGeneration, AiStudioFrameQuote, AiStudioFrameRequest, AiVideoTemplateDefinition, GenerateVideoConfig, MockupAsset, PromoVideo, RunAction, VideoRunSummary, VideoStoryboard, VideoTemplateCatalogItem, WorkflowCapabilities, WorkflowRun } from "@/types/video-workflow";

export const videoWorkflowKeys = {
  capabilities: () => ["workflow-capabilities"] as const,
  templates: () => ["video-templates"] as const,
  aiTemplates: () => ["ai-video-templates"] as const,
  run: (id: string | null) => ["workflow-runs", id] as const,
  latestRun: (workflowId: string | null) => ["workflow-runs", "latest", workflowId] as const,
  videoRuns: (workflowId: string | null) => ["workflow-runs", "videos", workflowId] as const,
  assets: (id: string) => ["mockup-assets", id] as const,
  videos: (id: string | null) => ["workflow-videos", id] as const,
  sceneVideos: (id: string | null) => ["workflow-scene-videos", id] as const,
};
export const getWorkflowCapabilities = async () => (await api.get<WorkflowCapabilities>("/api/workflows/capabilities")).data;
export const listVideoTemplates = async () => (await api.get<VideoTemplateCatalogItem[]>("/api/workflows/video-templates")).data;
export const listAiVideoTemplates = async () => (await api.get<AiVideoTemplateDefinition[]>("/api/workflows/ai-video-templates")).data;
export const startWorkflowRun = async ({ workflowId, revision, key }: { workflowId: string; revision: number; key: string }) => (await api.post<WorkflowRun>(`/api/workflows/${workflowId}/runs`, { expectedWorkflowRevision: revision, idempotencyKey: key })).data;
export const getWorkflowRun = async (id: string) => (await api.get<WorkflowRun>(`/api/workflow-runs/${id}`)).data;
export const getLatestWorkflowRun = async (workflowId: string): Promise<WorkflowRun | null> => {
  try {
    return (await api.get<WorkflowRun>(`/api/workflows/${workflowId}/runs/latest`)).data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};
export const listWorkflowVideoRuns = async (workflowId: string) =>
  (await api.get<VideoRunSummary[]>(`/api/workflows/${workflowId}/video-runs`)).data;
export const actOnWorkflowRun = async ({ runId, ...action }: RunAction & { runId: string }) => (await api.post<WorkflowRun>(`/api/workflow-runs/${runId}/actions`, action)).data;
export const quoteAiShot = async (runId: string, config?: GenerateVideoConfig, regenerate = false, sceneOrder?: number) => (await api.post<AiShotQuote>(`/api/workflow-runs/${runId}/ai-shot-quote`, { config, regenerate, sceneOrder })).data;
export const listMockupAssets = async (id: string) => (await api.get<MockupAsset[]>(`/api/products/${id}/mockup-assets`)).data;
export const uploadMockupAsset = async ({ productId, file }: { productId: string; file: File }) => (await api.postForm<MockupAsset>(`/api/products/${productId}/mockup-assets`, { file })).data;
export const generateLifestyleMockup = async ({ productId, garmentMockupId, file }: { productId: string; garmentMockupId: string; file: File }) => (await api.postForm<MockupAsset>(`/api/products/${productId}/mockup-assets/lifestyle`, { garmentMockupId, file })).data;
const studioFrameForm = (request: AiStudioFrameRequest) => {
  const form = new FormData();
  form.append("sourceMockupId", request.sourceMockupId);
  form.append("layout", request.layout);
  form.append("outputFormat", request.outputFormat);
  form.append("regenerate", String(request.regenerate ?? false));
  form.append("referenceRightsConfirmed", String(request.referenceRightsConfirmed ?? false));
  if (request.expectedFingerprint) form.append("expectedFingerprint", request.expectedFingerprint);
  if (request.confirmedEstimatedCostUsd !== undefined) form.append("confirmedEstimatedCostUsd", String(request.confirmedEstimatedCostUsd));
  if (request.customPrompt) form.append("customPrompt", request.customPrompt);
  if (request.templateCode) form.append("templateCode", request.templateCode);
  request.references?.forEach(file => form.append("references", file, file.name));
  return form;
};
export const quoteAiStudioFrame = async ({ productId, ...request }: AiStudioFrameRequest & { productId: string }) => (await api.post<AiStudioFrameQuote>(`/api/products/${productId}/studio-keyframe/quote`, studioFrameForm(request))).data;
export const generateAiStudioFrame = async ({ productId, ...request }: AiStudioFrameRequest & { productId: string }) => (await api.post<AiStudioFrameGeneration>(`/api/products/${productId}/studio-keyframe/generate`, studioFrameForm(request))).data;
export const updateMockupAsset = async ({ id, expectedRevision, ...values }: MockupMetadataFormValues & { id: string; expectedRevision: number }) => (await api.put<MockupAsset>(`/api/mockup-assets/${id}`, { ...values, expectedRevision })).data;
export const reviewMockupAsset = async ({ id, revision, approved }: { id: string; revision: number; approved: boolean }) => (await api.post<MockupAsset>(`/api/mockup-assets/${id}/review`, { expectedRevision: revision, approved })).data;
export const listRunVideos = async (id: string) => (await api.get<PromoVideo[]>(`/api/workflow-runs/${id}/videos`)).data;
export const listRunSceneVideos = async (id: string) => (await api.get<AiSceneVideo[]>(`/api/workflow-runs/${id}/scene-videos`)).data;
export const mediaDownload = async ({ id, zip }: { id: string; zip: boolean }) => (await api.get<string>(`/api/${zip ? "video-exports" : "promo-videos"}/${id}/download`)).data;
export const previewVideoStoryboard = async ({ productId, ...request }: { productId: string; config: GenerateVideoConfig; mockupIds: string[]; artworkGroupKey: string }) => (await api.post<VideoStoryboard>(`/api/products/${productId}/video-storyboard`, request)).data;
