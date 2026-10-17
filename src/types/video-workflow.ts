import type { z } from "zod";

import type { generateVideoConfigSchema } from "@/schemas/workflow";

export type GenerateVideoConfig = z.infer<typeof generateVideoConfigSchema>;
export interface AiVideoSceneOptions {
  mode: "ai";
  mockupId: string | null;
  templateCode: string;
  durationSeconds: 4 | 6 | 8;
  framing: string;
  cameraAngle: string;
  cameraMovement: string;
  subjectMotion: string;
  motionIntensity: string;
  lighting: string;
  extraInstructions: string | null;
  rightsConfirmed: boolean;
  startFrameMode?: "direct" | "studio" | null;
  studioLayout?: "hanging_window" | "flat_lay" | "none" | null;
  studioFrameId?: string | null;
  studioPrompt?: string | null;
  studioReferenceHashes?: string[] | null;
}
export interface AiVideoTemplateDefinition {
  code: string;
  name: string;
  description: string;
  promptVersion: number;
  basePrompt: string;
  commonPrompt?: string | null;
  requiresLifestyle: boolean;
  requiresDetail: boolean;
  allowedSettings: Record<string, string[]>;
  defaults: AiVideoSceneOptions;
}
export interface VideoTemplateRequirements { minimumAssets: number; requiresDetail: boolean; minimumVariants: number }
export interface VideoTemplateCatalogItem { code: string; version: number; name: string; description: string; previewVideoUrl: string | null; defaultDurationSeconds: number; defaultTransition: "none" | "fade" | "cut"; defaultMotionPreset: string; requirements: VideoTemplateRequirements | null }
export interface AiShotPlan { sceneOrder: number; mockupId: string; sourceHash: string; model: string; preset: string; prompt: string; durationSeconds: number; fingerprint: string; providerKey: string; modelKey: string; promptVersion: number; sourceCrop: Region | null }
export interface VideoStoryboard { template: string; templateVersion: number; durationSeconds: number; outputDurationFrames?: number | null; productType: string; scenes: ScenePlan[]; fingerprint: string; outputFormat: string; width: number; height: number; aspectRatio: string; mode?: "standard" | "ai_shot"; transitionOverlapFrames?: number; aiShots?: AiShotPlan[] | null }
export interface VideoModeCapability { mode: string; enabled: boolean; availability: string; description: string; supportsFallback: boolean; estimatedCostRange: { currency: string; minimum: number; maximum: number; note: string } | null }
export interface WorkflowCapabilities { definitionVersion: number; nodes: { type: string; enabled: boolean; description: string }[]; videoModes: VideoModeCapability[] }
export interface Region { x: number; y: number; width: number; height: number }
export interface MockupRegions { focalPoint: { x: number; y: number } | null; product: Region | null; artwork: Region | null; detail: Region | null }
export interface MockupAsset { id: string; productId: string; sourceType: string; role: string; artworkGroupKey: string | null; variantKey: string | null; revision: number; approvalStatus: string; approvedRevision: number | null; width: number; height: number; regions: MockupRegions; previewUrl: string; warnings: string[] }
export interface AiStudioFrameRequest { sourceMockupId: string; layout: "hanging_window" | "flat_lay" | "none"; outputFormat: string; customPrompt?: string | null; templateCode?: string | null; references?: File[]; referenceRightsConfirmed?: boolean; regenerate?: boolean; expectedFingerprint?: string; confirmedEstimatedCostUsd?: number }
export interface AiStudioFrameQuote { fingerprint: string; promptVersion: number; estimatedCostUsd: number; existingFrame: MockupAsset | null; note: string }
export interface AiStudioFrameGeneration { frame: MockupAsset; reused: boolean; estimatedCostUsd: number }
export type SceneMotion = "gentle" | "contain_gentle" | "static" | "pan" | "zoom" | "zoom_out" | "pan_left" | "pan_up" | "pan_down" | "diagonal_up_right" | "diagonal_up_left" | "diagonal_down_right" | "diagonal_down_left";
export type VideoTransition = "none" | "fade" | "swipe" | "zoom" | "flash" | "whip_pan" | "blur" | "cut";
export interface ScenePlan { mockupId: string; sourceRevision: number; sourceHash: string; role: string; sceneOrder: number; durationFrames: number; crop: Region; endCrop: Region; motion: SceneMotion; transition: VideoTransition; text: string; generationStrategy: string; warnings: string[]; aiTemplateCode?: string | null; promptVersion?: number | null; compiledPrompt?: string | null; aiSettings?: AiVideoSceneOptions | null; sourceCrop?: Region | null; aiProviderKey?: string | null; aiModelKey?: string | null; aiModelName?: string | null }
export interface PromoVideo { id: string; runId: string; mode: string; template: string; version: number; reviewRevision: number; status: string; approvalStatus: string; previewUrl: string | null; thumbnailUrl: string | null; qa: Record<string, unknown>; scenes: ScenePlan[]; outputFormat: string; width: number; height: number; aspectRatio: string }
export interface AiSceneVideo { sceneOrder: number; status: string; previewUrl: string | null; failure: string | null }
export interface WorkflowNodeRun { id: string; nodeId: string; nodeType: string; status: string; attempt: number; stage: string | null; progress: number; errorMessage: string | null; output: Record<string, unknown> }
export interface WorkflowRun { id: string; workflowId: string; productId: string; status: string; revision: number; workflowRevision: number; createdAt: string; errorMessage: string | null; nodes: WorkflowNodeRun[] }
export interface RunAction { expectedRevision: number; action: "cancel" | "resume_mockups" | "approve_video" | "reject_video" | "rerender" | "retry" | "regenerate_ai_shot" | "retry_listing"; videoId?: string; reviewRevision?: number; config?: GenerateVideoConfig; expectedStoryboardFingerprint?: string; aiShotQuoteToken?: string; sceneOrder?: number }
export interface AiShotQuote { token: string; estimatedCostUsd: number; newClips: number; expiresAtUtc: string; model: string; note: string }
