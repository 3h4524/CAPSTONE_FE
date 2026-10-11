import type { z } from "zod";

import type { generateVideoConfigSchema } from "@/schemas/workflow";

export type GenerateVideoConfig = z.infer<typeof generateVideoConfigSchema>;
export interface VideoTemplateRequirements { minimumAssets: number; requiresDetail: boolean; minimumVariants: number }
export interface VideoTemplateCatalogItem { code: string; version: number; name: string; description: string; previewVideoUrl: string | null; defaultDurationSeconds: number; defaultTransition: "fade" | "cut"; defaultMotionPreset: string; requirements: VideoTemplateRequirements | null }
export interface VideoStoryboard { template: string; templateVersion: number; durationSeconds: number; productType: string; scenes: ScenePlan[]; fingerprint: string; outputFormat: string; width: number; height: number; aspectRatio: string }
export interface VideoModeCapability { mode: string; enabled: boolean; availability: string; description: string; supportsFallback: boolean; estimatedCostRange: { currency: string; minimum: number; maximum: number; note: string } | null }
export interface WorkflowCapabilities { definitionVersion: number; nodes: { type: string; enabled: boolean; description: string }[]; videoModes: VideoModeCapability[] }
export interface Region { x: number; y: number; width: number; height: number }
export interface MockupRegions { focalPoint: { x: number; y: number } | null; product: Region | null; artwork: Region | null; detail: Region | null }
export interface MockupAsset { id: string; productId: string; sourceType: string; role: string; artworkGroupKey: string | null; variantKey: string | null; revision: number; approvalStatus: string; approvedRevision: number | null; width: number; height: number; regions: MockupRegions; previewUrl: string; warnings: string[] }
export type SceneMotion = "gentle" | "contain_gentle" | "static" | "pan" | "zoom" | "zoom_out" | "pan_left" | "pan_up" | "pan_down" | "diagonal_up_right" | "diagonal_up_left" | "diagonal_down_right" | "diagonal_down_left";
export interface ScenePlan { mockupId: string; sourceRevision: number; sourceHash: string; role: string; sceneOrder: number; durationFrames: number; crop: Region; endCrop: Region; motion: SceneMotion; transition: "fade" | "cut"; text: string; generationStrategy: string; warnings: string[] }
export interface PromoVideo { id: string; runId: string; mode: string; template: string; version: number; reviewRevision: number; status: string; approvalStatus: string; previewUrl: string | null; thumbnailUrl: string | null; qa: Record<string, unknown>; scenes: ScenePlan[]; outputFormat: string; width: number; height: number; aspectRatio: string }
export interface WorkflowNodeRun { id: string; nodeId: string; nodeType: string; status: string; attempt: number; stage: string | null; progress: number; errorMessage: string | null; output: Record<string, unknown> }
export interface WorkflowRun { id: string; workflowId: string; productId: string; status: string; revision: number; workflowRevision: number; createdAt: string; errorMessage: string | null; nodes: WorkflowNodeRun[] }
export interface RunAction { expectedRevision: number; action: "cancel" | "resume_mockups" | "approve_video" | "reject_video" | "rerender" | "retry"; videoId?: string; reviewRevision?: number; config?: GenerateVideoConfig; expectedStoryboardFingerprint?: string }
