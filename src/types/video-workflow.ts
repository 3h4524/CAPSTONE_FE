import type { z } from "zod";

import type { generateVideoConfigSchema } from "@/schemas/workflow";

export type GenerateVideoConfig = z.infer<typeof generateVideoConfigSchema>;
export interface AiVideoSceneOptions {
  mode: "ai" | "standard";
  aiVideoModelKey?: "minimax_h3" | "minimax_h3_lite" | null;
  mockupId: string | null;
  templateCode: string;
  subtemplateCode?: string | null;
  durationSeconds: number;
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
  standardMotionPreset?: SceneMotion | null;
  standardBaseCrop?: Region | null;
  standardStartCrop?: Region | null;
  standardEndCrop?: Region | null;
  standardStartScale?: number | null;
  standardEndScale?: number | null;
  standardStartRotation?: number | null;
  standardEndRotation?: number | null;
  aiCropPosition?: { x: number; y: number } | null;
  aiStartFrameCrop?: Region | null;
  displayDurationFrames?: number | null;
  trimStartFrames?: number | null;
  trimEndFrames?: number | null;
  transitionIn?: VideoTransition | null;
  transitionDurationFrames?: number | null;
}
export interface VideoOverlay {
  id: string;
  type: "headline" | "cta";
  text: string;
  startFrame: number;
  endFrame: number;
  x: number;
  y: number;
  align: "left" | "center" | "right";
  preset: "clean" | "bold" | "minimal" | "solid" | "pill" | "outline";
  fontScale: number;
  textColor: string;
  backgroundColor: string;
}
export interface VideoMusicConfig {
  trackId: string;
  startFrame: number;
  sourceOffsetFrames: number;
  volume: number;
  fadeInFrames: number;
  fadeOutFrames: number;
  loop: boolean;
  muted: boolean;
}
export interface VideoEditConfig {
  version: 1;
  music: VideoMusicConfig | null;
  overlays: VideoOverlay[];
}
export interface MusicTrack {
  id: string;
  name: string;
  artistName: string;
  durationSeconds: number;
  genre: string;
  mood: string;
  license: string;
  previewUrl: string;
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
  subtemplates?: AiVideoSubtemplateDefinition[] | null;
  defaultSubtemplateCode?: string | null;
}
export interface AiCharacterCatalogItem {
  id: string;
  code: string;
  name: string;
  continent: string;
  gender: string;
  ageMin: number;
  ageMax: number;
  bodyType: string;
  skinTone: string;
  description: string;
  imageUrl: string;
  previewUrl: string;
  isDefault: boolean;
}
export interface AiVideoSubtemplateDefinition {
  code: string;
  name: string;
  description: string;
  basePrompt: string;
  defaults: AiVideoSceneOptions;
  startFramePrompt?: string | null;
}
export interface VideoPackSceneDefinition {
  id: string;
  mode: "ai" | "standard";
  durationSeconds: number;
  templateCode?: string | null;
  subtemplateCode?: string | null;
  transitionIn?: VideoTransition | null;
  transitionDurationFrames?: number | null;
  standardMotionPreset?: SceneMotion | null;
}
export interface VideoPackDefinition {
  code: string;
  version: number;
  name: string;
  description: string;
  previewVideoUrl: string | null;
  totalDurationSeconds: number;
  requiresCharacter: boolean;
  requiresSharedMockup: boolean;
  scenes: VideoPackSceneDefinition[];
}
export interface VideoTemplateRequirements {
  minimumAssets: number;
  requiresDetail: boolean;
  minimumVariants: number;
}
export interface VideoTemplateCatalogItem {
  code: string;
  version: number;
  name: string;
  description: string;
  previewVideoUrl: string | null;
  defaultDurationSeconds: number;
  defaultTransition: "none" | "fade" | "cut";
  defaultMotionPreset: string;
  requirements: VideoTemplateRequirements | null;
}
export interface AiPromptPart {
  key: string;
  label: string;
  content: string;
  includedInFinalPrompt: boolean;
}
export interface VideoPromptExperience {
  lessonId: string;
  revision: string | null;
  content: string;
}
export interface AiPromptTrace {
  ruleVersion: number | null;
  ragStatus: string;
  appliedRules: string[];
  warnings: string[];
  parts: AiPromptPart[];
  finalPrompt: string;
  retrievedExperiences?: VideoPromptExperience[] | null;
}
export interface AiShotPlan {
  sceneOrder: number;
  mockupId: string;
  sourceHash: string;
  model: string;
  preset: string;
  prompt: string;
  durationSeconds: number;
  fingerprint: string;
  providerKey: string;
  modelKey: string;
  promptVersion: number;
  sourceCrop: Region | null;
  resolution: string;
  pricePerSecondUsd: number;
}
export interface VideoStoryboard {
  template: string;
  templateVersion: number;
  durationSeconds: number;
  outputDurationFrames?: number | null;
  productType: string;
  scenes: ScenePlan[];
  fingerprint: string;
  outputFormat: string;
  width: number;
  height: number;
  aspectRatio: string;
  mode?: "standard" | "ai_shot";
  transitionOverlapFrames?: number;
  aiShots?: AiShotPlan[] | null;
  videoEdit?: VideoEditConfig | null;
}
export interface VideoModeCapability {
  mode: string;
  enabled: boolean;
  availability: string;
  description: string;
  supportsFallback: boolean;
  estimatedCostRange: { currency: string; minimum: number; maximum: number; note: string } | null;
}
export interface WorkflowCapabilities {
  definitionVersion: number;
  nodes: { type: string; enabled: boolean; description: string }[];
  videoModes: VideoModeCapability[];
}
export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface AiStudioFrameMetadata {
  fingerprint: string;
  sourceMockupId: string;
  sourceHash: string;
  sourceRevision: number;
  layout: string;
  aspectRatio: string;
  promptVersion: number;
  customPrompt?: string | null;
  templateCode?: string | null;
  references?: { contentHash: string }[] | null;
}
export interface MockupRegions {
  focalPoint: { x: number; y: number } | null;
  product: Region | null;
  artwork: Region | null;
  detail: Region | null;
  studioFrame?: AiStudioFrameMetadata | null;
}
export interface MockupAsset {
  id: string;
  productId: string;
  sourceType: string;
  role: string;
  artworkGroupKey: string | null;
  variantKey: string | null;
  revision: number;
  approvalStatus: string;
  approvedRevision: number | null;
  width: number;
  height: number;
  regions: MockupRegions;
  previewUrl: string;
  warnings: string[];
  /** The mock-up template it was composited from; null for an uploaded or AI-made image. */
  mockupTemplateId?: string | null;
  designImageId?: string | null;
}
export interface AiStudioFrameRequest {
  sourceMockupId: string;
  layout: "hanging_window" | "flat_lay" | "none";
  outputFormat: string;
  customPrompt?: string | null;
  templateCode?: string | null;
  references?: File[];
  referenceRightsConfirmed?: boolean;
  regenerate?: boolean;
  expectedFingerprint?: string;
  confirmedEstimatedCostUsd?: number;
}
export interface AiStudioFrameQuote {
  fingerprint: string;
  promptVersion: number;
  estimatedCostUsd: number;
  existingFrame: MockupAsset | null;
  note: string;
}
export interface AiStudioFrameGeneration {
  frame: MockupAsset;
  reused: boolean;
  estimatedCostUsd: number;
}
export type SceneMotion =
  | "gentle"
  | "contain_gentle"
  | "static"
  | "pan"
  | "zoom"
  | "zoom_out"
  | "pan_left"
  | "pan_up"
  | "pan_down"
  | "diagonal_up_right"
  | "diagonal_up_left"
  | "diagonal_down_right"
  | "diagonal_down_left"
  | "rotate_cw"
  | "rotate_ccw"
  | "rotate_zoom_cw"
  | "rotate_zoom_ccw"
  | "custom";
export type VideoTransition =
  | "none"
  | "fade"
  | "swipe"
  | "zoom"
  | "flash"
  | "whip_pan"
  | "blur"
  | "cut";
export interface ScenePlan {
  mockupId: string;
  sourceRevision: number;
  sourceHash: string;
  role: string;
  sceneOrder: number;
  durationFrames: number;
  crop: Region;
  endCrop: Region;
  motion: SceneMotion;
  transition: VideoTransition;
  text: string;
  generationStrategy: string;
  warnings: string[];
  startScale?: number;
  endScale?: number;
  startRotation?: number;
  endRotation?: number;
  aiTemplateCode?: string | null;
  promptVersion?: number | null;
  compiledPrompt?: string | null;
  aiSettings?: AiVideoSceneOptions | null;
  sourceCrop?: Region | null;
  aiProviderKey?: string | null;
  aiModelKey?: string | null;
  aiModelName?: string | null;
  aiResolution?: string | null;
  aiPricePerSecondUsd?: number | null;
  aiPromptTrace?: AiPromptTrace | null;
  trimStartFrames?: number;
  trimEndFrames?: number;
  transitionFrames?: number;
}
export interface PromoVideo {
  id: string;
  runId: string;
  mode: string;
  template: string;
  version: number;
  reviewRevision: number;
  status: string;
  approvalStatus: string;
  previewUrl: string | null;
  thumbnailUrl: string | null;
  qa: Record<string, unknown>;
  scenes: ScenePlan[];
  outputFormat: string;
  width: number;
  height: number;
  aspectRatio: string;
  config?: GenerateVideoConfig | null;
  artworkGroupKey?: string | null;
  mockupIds?: string[] | null;
}
export interface AiSceneVideo {
  sceneOrder: number;
  status: string;
  previewUrl: string | null;
  failure: string | null;
}
export type VideoReviewCategory =
  | "body"
  | "hands"
  | "person_product"
  | "artwork"
  | "text"
  | "camera"
  | "other";
export type VideoReviewSeverity = "low" | "medium" | "high" | "critical";
export type CorrectionTarget =
  | "source_image"
  | "prompt_template"
  | "prompt_rule"
  | "rag_experience"
  | "unknown";
export type VideoQualityStatus =
  | "queued"
  | "running"
  | "completed"
  | "uncertain"
  | "skipped"
  | "failed";
export interface VideoSceneEvaluation {
  status: VideoQualityStatus;
  evaluatedAtUtc: string | null;
  evaluatorVersion: string;
  metrics: Record<string, unknown>;
  detail: string | null;
}
export interface CorrectionSuggestion {
  target: CorrectionTarget;
  reason: string;
  confidence: "high" | "medium" | "low";
}
export interface VideoSceneReview {
  id: string;
  startMilliseconds: number;
  endMilliseconds: number;
  category: VideoReviewCategory;
  severity: VideoReviewSeverity;
  presentInSourceImage: boolean;
  description: string;
  status: "suggested" | "confirmed";
  suggestion: CorrectionSuggestion;
  confirmedTarget: CorrectionTarget | null;
  lessonId: string | null;
  lessonStatus: VideoExperience["status"] | null;
  lessonRevision: string | null;
  lessonContent: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}
export interface VideoSceneQuality {
  videoId: string;
  sceneOrder: number;
  evaluation: VideoSceneEvaluation | null;
  reviews: VideoSceneReview[];
}
export interface EtsyComplianceCheck {
  key: string;
  status: "pass" | "warning" | "fail" | "info";
  detail: string;
}
export interface EtsyComplianceResult {
  status: "pass" | "pass_with_warning" | "fail";
  checks: EtsyComplianceCheck[];
}
export interface VideoQualitySceneSummary {
  sceneOrder: number;
  status: VideoQualityStatus | "not_applicable";
  detail: string | null;
  metrics: Record<string, unknown>;
}
export interface VideoQualitySummary {
  videoId: string;
  status: VideoQualityStatus | "not_applicable" | "pass" | "fail" | "warning";
  technical: Record<string, unknown>;
  etsyCompliance: EtsyComplianceResult | null;
  scenes: VideoQualitySceneSummary[];
}
export interface SaveVideoSceneReviewRequest {
  startMilliseconds: number;
  endMilliseconds: number;
  category: VideoReviewCategory;
  severity: VideoReviewSeverity;
  presentInSourceImage: boolean;
  description: string;
  confirmSuggestion: boolean;
  targetOverride?: CorrectionTarget;
  candidateLesson?: string;
  suspectRagExperience?: boolean;
}
export interface VideoExperience {
  lessonId: string;
  status: "candidate" | "verified" | "rejected" | "retired";
  revision: string | null;
  content: string;
}
export interface ReviseVideoExperienceRequest {
  reviewId: string;
  content: string;
}
export interface WorkflowNodeRun {
  id: string;
  nodeId: string;
  nodeType: string;
  status: string;
  attempt: number;
  stage: string | null;
  progress: number;
  errorMessage: string | null;
  output: Record<string, unknown>;
}
export interface WorkflowRun {
  id: string;
  workflowId: string;
  productId: string;
  status: string;
  revision: number;
  workflowRevision: number;
  createdAt: string;
  errorMessage: string | null;
  nodes: WorkflowNodeRun[];
  /** Set on the runs of a batch video run, one per design. */
  runGroupId?: string | null;
  artworkGroupKey?: string | null;
}
export interface RunGroupProgress {
  total: number;
  queued: number;
  running: number;
  waitingForReview: number;
  completed: number;
  failed: number;
  cancelled: number;
  waitingForInput: number;
}
export interface RunGroupScenePreview {
  sceneIndex: number;
  mockupId: string | null;
  previewUrl: string | null;
  warning: string | null;
  overridden: boolean;
}
/** One design of one product in a batch video run. */
export interface RunGroupTarget {
  key: string;
  productId: string;
  productName: string;
  productType: string;
  artworkGroupKey: string;
  designLabel: string;
  previewUrl: string | null;
  mockupCount: number;
  approvedCount: number;
  pendingCount: number;
  selected: boolean;
  hasOverride: boolean;
  scenes: RunGroupScenePreview[];
  warnings: string[];
  /** Why the design cannot be rendered with the current scenes; null when it can. */
  resolveError: string | null;
  runId: string | null;
  runStatus: string | null;
  currentStep: string | null;
  stage: string | null;
  progress: number;
  runError: string | null;
  /** The design's Generate Video settings: its own before the videos start (null while shared), then its run's. */
  config: GenerateVideoConfig | null;
  /** The design has settings of its own instead of the workflow's shared ones. */
  hasOwnConfig: boolean;
}
export type RunGroupStatus = "waiting_for_targets" | "running" | "completed" | "cancelled";
export interface RunGroup {
  id: string;
  workflowId: string;
  batchId: string;
  batchJobId: string | null;
  status: RunGroupStatus;
  revision: number;
  workflowRevision: number;
  createdAt: string;
  maximumTargets: number;
  selectedCount: number;
  progress: RunGroupProgress;
  targets: RunGroupTarget[];
}
export interface RunGroupSummary {
  id: string;
  status: RunGroupStatus;
  createdAt: string;
  targetCount: number;
  completedCount: number;
  /** The design job whose designs the group made videos of; null for a group of the whole batch. */
  batchJobId?: string | null;
}
export interface SceneMockupOverride {
  sceneIndex: number;
  mockupId: string;
}
export interface VideoRunSummary {
  id: string;
  status: string;
  createdAt: string;
  videoCount: number;
  latestVersion: number;
}
export interface RunAction {
  expectedRevision: number;
  action:
    | "cancel"
    | "resume_mockups"
    | "approve_video"
    | "reject_video"
    | "rerender"
    | "retry"
    | "regenerate_ai_shot"
    | "retry_listing";
  videoId?: string;
  reviewRevision?: number;
  config?: GenerateVideoConfig;
  expectedStoryboardFingerprint?: string;
  aiShotQuoteToken?: string;
  sceneOrder?: number;
}
export interface AiShotQuote {
  token: string;
  estimatedCostUsd: number;
  newClips: number;
  expiresAtUtc: string;
  model: string;
  note: string;
  /** A batch quote's part for each design; absent on a single run's quote. */
  items?: AiShotQuoteItem[] | null;
}
export interface AiShotQuoteItem {
  label: string;
  clips: number;
  seconds: number;
  estimatedCostUsd: number;
}
/** One line of what a Run is expected to cost. */
export interface RunCostItem {
  kind: "design_images" | "ai_video" | "model_photos";
  label: string;
  detail: string;
  quantity: number;
  estimatedCostUsd: number;
}
/** What one Run of the saved workflow is expected to cost, before anything is made. */
export interface RunCostEstimate {
  items: RunCostItem[];
  totalUsd: number;
  /** The AI clip part: confirming the estimate lets an automatic Mockup Approval start the videos within it. */
  aiVideoBudgetUsd: number;
  note: string;
}
