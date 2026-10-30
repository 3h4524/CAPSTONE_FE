import axios from "axios";

import { api } from "@/api/client";
import type { MockupMetadataFormValues } from "@/schemas/video-workflow";
import type { AiSceneVideo, AiShotQuote, AiStudioFrameGeneration, AiStudioFrameQuote, AiStudioFrameRequest, AiVideoTemplateDefinition, GenerateVideoConfig, MockupAsset, MusicTrack, PromoVideo, ReviseVideoExperienceRequest, RunAction, SaveVideoSceneReviewRequest, VideoExperience, VideoRunSummary, VideoSceneQuality, VideoStoryboard, VideoTemplateCatalogItem, WorkflowCapabilities, WorkflowRun } from "@/types/video-workflow";

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
  sceneQuality: (runId: string | null, videoId: string | null, sceneOrder: number | null) => ["video-scene-quality", runId, videoId, sceneOrder] as const,
  music: () => ["music-tracks"] as const,
};
export const getWorkflowCapabilities = async () => (await api.get<WorkflowCapabilities>("/api/workflows/capabilities")).data;
export const listVideoTemplates = async () => (await api.get<VideoTemplateCatalogItem[]>("/api/workflows/video-templates")).data;
export const listAiVideoTemplates = async () => (await api.get<AiVideoTemplateDefinition[]>("/api/workflows/ai-video-templates")).data;
export const listMusicTracks = async () => (await api.get<MusicTrack[]>("/api/music-tracks")).data;
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
export const quoteAiShot = async (runId: string, config?: GenerateVideoConfig, regenerate = false, sceneOrder?: number, expectedStoryboardFingerprint?: string) =>
  (await api.post<AiShotQuote>(`/api/workflow-runs/${runId}/ai-shot-quote`, { config, regenerate, sceneOrder, expectedStoryboardFingerprint })).data;
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
export const getVideoSceneQuality = async ({ runId, videoId, sceneOrder }: { runId: string; videoId: string; sceneOrder: number }) =>
  (await api.get<VideoSceneQuality>(`/api/video-quality/runs/${runId}/videos/${videoId}/scenes/${sceneOrder}`)).data;
export const evaluateVideoScene = async ({ runId, videoId, sceneOrder }: { runId: string; videoId: string; sceneOrder: number }) =>
  (await api.post<VideoSceneQuality>(`/api/video-quality/runs/${runId}/videos/${videoId}/scenes/${sceneOrder}/evaluate`)).data;
export const saveVideoSceneReview = async ({ runId, videoId, sceneOrder, ...request }: { runId: string; videoId: string; sceneOrder: number } & SaveVideoSceneReviewRequest) =>
  (await api.put<VideoSceneQuality>(`/api/video-quality/runs/${runId}/videos/${videoId}/scenes/${sceneOrder}/reviews`, request)).data;
export const setVideoExperienceStatus = async ({ lessonId, status }: { lessonId: string; status: VideoExperience["status"] }) =>
  (await api.put<VideoExperience>(`/api/video-quality/lessons/${lessonId}/status`, { status })).data;
export const reviseVideoExperience = async ({ runId, videoId, sceneOrder, lessonId, ...request }: { runId: string; videoId: string; sceneOrder: number; lessonId: string } & ReviseVideoExperienceRequest) =>
  (await api.put<VideoSceneQuality>(`/api/video-quality/runs/${runId}/videos/${videoId}/scenes/${sceneOrder}/lessons/${lessonId}/revision`, request)).data;
export const mediaDownload = async ({ id, zip }: { id: string; zip: boolean }) => (await api.get<string>(`/api/${zip ? "video-exports" : "promo-videos"}/${id}/download`)).data;
export const previewVideoStoryboard = async ({ productId, ...request }: { productId: string; config: GenerateVideoConfig; mockupIds: string[]; artworkGroupKey: string }) => (await api.post<VideoStoryboard>(`/api/products/${productId}/video-storyboard`, request)).data;
