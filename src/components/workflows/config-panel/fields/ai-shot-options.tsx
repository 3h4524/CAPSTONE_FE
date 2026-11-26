"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  Check,
  ChevronDown,
  Clapperboard,
  Copy,
  GripVertical,
  ImageIcon,
  Lock,
  Minus,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  generateAiStudioFrame,
  previewVideoStoryboard,
  quoteAiStudioFrame,
  videoWorkflowKeys,
} from "@/api/video-workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AiStartFrameCropDialog } from "@/components/workflows/config-panel/fields/ai-start-frame-crop-dialog";
import { CONTENT_ISSUE_CLASS, ContentIssueMessage } from "@/components/workflows/config-panel/fields/content-issue";
import { SceneVideoResult } from "@/components/workflows/config-panel/fields/scene-video-result";
import {
  getStandardBaseCrop,
  STANDARD_MOTION_OPTIONS,
  StandardMotionEditor,
  StandardMotionPreview,
} from "@/components/workflows/config-panel/fields/standard-motion-editor";
import {
  VideoTemplateList,
  type VideoTemplateOption,
} from "@/components/workflows/config-panel/fields/video-template-list";
import { VideoTemplateThumbnail } from "@/components/workflows/config-panel/fields/video-template-thumbnail";
import { VideoTimelineEditor } from "@/components/workflows/media/video-timeline-editor";
import { type AiCharacter, getAiCharacter } from "@/constants/ai-characters";
import { confirmAiShot } from "@/helpers/confirm-ai-shot";
import { getErrorMessage } from "@/helpers/error-message";
import { counterpartMockup, mainMockup, personMockup } from "@/helpers/main-mockup";
import { hasFeature } from "@/helpers/plan-features";
import { sameConfig } from "@/helpers/product-video-configs";
import { showToast } from "@/helpers/toast";
import { getVideoOutputFormat } from "@/helpers/video-output-formats";
import { readString, readStringArray } from "@/helpers/workflow-config";
import { videoRunProducts } from "@/helpers/workflow-run";
import { useReviewMockupAsset } from "@/hooks/mutations/use-review-mockup-asset";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useAiCharacterModels } from "@/hooks/queries/use-ai-character-models";
import { useAiVideoTemplates } from "@/hooks/queries/use-ai-video-templates";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useEntitlements } from "@/hooks/queries/use-entitlements";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { usePreviewDesign } from "@/hooks/queries/use-preview-design";
import { useRunGroupId } from "@/hooks/queries/use-run-group";
import { useRunSceneVideos } from "@/hooks/queries/use-run-scene-videos";
import { useVideoPacks } from "@/hooks/queries/use-video-packs";
import { useApplyVideoEdit } from "@/hooks/use-apply-video-edit";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowSave } from "@/hooks/use-workflow-save";
import { i18n } from "@/i18n/client";
import { generateVideoConfigSchema, MAX_CUSTOM_VIDEO_PROMPT } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowContentIssuesStore } from "@/stores/workflow-content-issues";
import type {
  AiSceneVideo,
  AiVideoSceneOptions,
  AiVideoTemplateDefinition,
  GenerateVideoConfig,
  MockupAsset,
  Region,
  VideoPackDefinition,
} from "@/types/video-workflow";
import { cn } from "@/utils/cn";

type LegacyOptions = NonNullable<GenerateVideoConfig["aiShotOptions"]>;
type ScenePromptPreview = {
  sceneOrder: number;
  config: GenerateVideoConfig;
  prompt?: string;
  model?: string;
  durationSeconds?: number;
};
const AI_ADVANCED_CONTROLS_ENABLED = false;
const MIN_VIDEO_DURATION_SECONDS = 5;
const MAX_VIDEO_DURATION_SECONDS = 15;
const BASE_SCENE: AiVideoSceneOptions = {
  mode: "standard",
  mockupId: null,
  templateCode: "cinematic_product_showcase",
  subtemplateCode: null,
  durationSeconds: 1,
  framing: "medium",
  cameraAngle: "three_quarter",
  cameraMovement: "push_in",
  subjectMotion: "none",
  motionIntensity: "subtle",
  lighting: "soft_studio",
  extraInstructions: null,
  rightsConfirmed: false,
  startFrameMode: "direct",
  studioLayout: "none",
  studioFrameId: null,
  studioPrompt: null,
  studioReferenceHashes: [],
};
const EMPTY_SCENES: AiVideoSceneOptions[] = [];
// AI templates the server no longer offers (AiVideoPromptCompiler.RetiredTemplateCodes), and the one a scene saved with
// each moves to: the two with a person to Product On Model, the reveal to the product showcase. Without it such a scene
// would show no template and its video could not be planned.
const RETIRED_TEMPLATES: Record<string, string> = {
  creator_pov_ugc: "lifestyle_in_use",
  everyday_story_moment: "lifestyle_in_use",
  signature_product_reveal: "cinematic_product_showcase",
};
const withCurrentTemplate = (scene: AiVideoSceneOptions): AiVideoSceneOptions => {
  const replacement = RETIRED_TEMPLATES[scene.templateCode];
  return replacement ? { ...scene, templateCode: replacement, subtemplateCode: null } : scene;
};
const EMPTY_IDS: string[] = [];
const workflowModeForScenes = (scenes: AiVideoSceneOptions[]) =>
  scenes.length > 0 && scenes.every((scene) => scene.mode === "standard") ? "standard" : "ai_shot";

const SETTING_LABELS: Record<string, string> = {
  framing: "Framing",
  cameraAngle: "Camera angle",
  cameraMovement: "Camera movement",
  subjectMotion: "Subject motion",
  motionIntensity: "Motion intensity",
  lighting: "Lighting / mood",
};
const TEMPLATE_SETTING_FIELDS = [
  "framing",
  "cameraAngle",
  "cameraMovement",
  "subjectMotion",
  "motionIntensity",
  "lighting",
] as const;
type TemplateSettingField = (typeof TEMPLATE_SETTING_FIELDS)[number];
const VALUE_LABELS: Record<string, string> = {
  wide: "Wide",
  medium: "Medium",
  medium_close: "Medium close-up",
  close_up: "Close-up",
  macro: "Macro",
  eye_level: "Eye level",
  three_quarter: "Three-quarter",
  source_view: "Source image angle",
  low_angle: "Low angle",
  top_down: "Top-down",
  locked: "Locked camera",
  push_in: "Slow push-in",
  pull_back: "Slow pull-back",
  orbit_left: "Orbit left",
  orbit_right: "Orbit right",
  pan_left: "Pan left",
  pan_right: "Pan right",
  gentle_tracking: "Gentle tracking",
  subtle_handheld: "Subtle handheld",
  none: "No subject motion",
  minimal: "Minimal / restrained",
  natural: "Natural movement",
  subtle: "Subtle",
  balanced: "Balanced",
  soft_studio: "Soft studio",
  bright_clean: "Bright and clean",
  cool_modern: "Cool modern",
  moody_cinematic: "Moody cinematic",
  warm_natural: "Warm natural",
  golden_hour: "Golden hour",
  source_image: "Source image lighting",
};
function convertLegacy(
  legacy: LegacyOptions | undefined,
  definition?: AiVideoTemplateDefinition,
  legacyDuration = 4
): AiVideoSceneOptions[] {
  const templateCode =
    legacy?.concept === "material_detail"
      ? "macro_detail_reveal"
      : legacy?.concept === "lifestyle_motion"
        ? "lifestyle_in_use"
        : legacy?.concept === "product_in_use"
          ? "lifestyle_in_use"
          : "cinematic_product_showcase";
  const duration = legacy?.coverage === "full_video" ? 8 : legacy ? 6 : 4;
  const defaults = definition?.defaults ?? BASE_SCENE;
  const first = {
    ...BASE_SCENE,
    ...defaults,
    mode: "ai" as const,
    templateCode,
    durationSeconds: duration,
    mockupId: legacy?.mockupId ?? legacy?.fullSceneMockupIds?.[0] ?? null,
    extraInstructions: legacy?.prompt ?? null,
    rightsConfirmed: legacy?.rightsConfirmed ?? false,
  };
  if (legacy?.coverage !== "full_video" || legacyDuration !== 15) return [first];
  const second = { ...first, durationSeconds: 6, mockupId: legacy.fullSceneMockupIds?.[1] ?? null };
  return [first, second];
}

const labelFor = (value: string) => VALUE_LABELS[value] ?? value.replaceAll("_", " ");

function resolveSubtemplate(scene: AiVideoSceneOptions, template: AiVideoTemplateDefinition) {
  if (!template.subtemplates?.length) return undefined;
  return (
    template.subtemplates.find((item) => item.code === scene.subtemplateCode) ??
    template.subtemplates.find((item) => item.code === template.defaultSubtemplateCode) ??
    template.subtemplates[0]
  );
}

function normalizeTemplateSettings(
  scene: AiVideoSceneOptions,
  template: AiVideoTemplateDefinition
): AiVideoSceneOptions {
  const subtemplate = resolveSubtemplate(scene, template);
  const defaults = subtemplate?.defaults ?? template.defaults;
  if (!AI_ADVANCED_CONTROLS_ENABLED) {
    return {
      ...scene,
      subtemplateCode: subtemplate?.code ?? null,
      framing: defaults.framing,
      cameraAngle: defaults.cameraAngle,
      cameraMovement: defaults.cameraMovement,
      subjectMotion: defaults.subjectMotion,
      motionIntensity: defaults.motionIntensity,
      lighting: defaults.lighting,
      extraInstructions: null,
      mode: "ai",
    };
  }
  let normalized: AiVideoSceneOptions = { ...scene, mode: "ai" };
  for (const field of TEMPLATE_SETTING_FIELDS) {
    const choices = template.allowedSettings[field] ?? [];
    if (choices.length === 0 || choices.includes(normalized[field])) continue;
    const defaultValue = defaults[field];
    normalized = {
      ...normalized,
      [field]: choices.includes(defaultValue) ? defaultValue : choices[0],
    } as AiVideoSceneOptions;
  }
  return normalized;
}

function hasUsableDetail(asset: MockupAsset) {
  if (isStudioFrame(asset)) return true;
  const hasLargeRegion = [asset.regions.detail, asset.regions.artwork].some(
    (region) =>
      region != null && Math.min(asset.width * region.width, asset.height * region.height) >= 512
  );
  return hasLargeRegion;
}

function isStudioFrame(asset: MockupAsset) {
  return Boolean(studioMetadata(asset));
}

type StudioFrameMetadata = NonNullable<MockupAsset["regions"]["studioFrame"]>;
function studioMetadata(asset: MockupAsset): StudioFrameMetadata | undefined {
  return asset.regions.studioFrame ?? undefined;
}
const normalizeStudioLayout = (_layout: string | null | undefined): "none" => "none";
const normalizeReferenceHashes = (
  referenceHashes: AiVideoSceneOptions["studioReferenceHashes"]
) => [...(referenceHashes ?? [])];

const buildProductOnModelScenes = (
  pack: VideoPackDefinition,
  catalog: AiVideoTemplateDefinition[]
): AiVideoSceneOptions[] =>
  pack.scenes.map((definition): AiVideoSceneOptions => {
    // Every scene of a pack is an ordinary scene: its image is picked per scene (or, in a batch run, each design's own
    // image is used, its model photo for a scene with a person), as for a scene added by hand.
    if (definition.mode === "standard")
      return {
        ...BASE_SCENE,
        mode: "standard",
        durationSeconds: definition.durationSeconds,
        transitionIn: definition.transitionIn ?? "cut",
        transitionDurationFrames: definition.transitionDurationFrames ?? 0,
        standardMotionPreset: definition.standardMotionPreset ?? null,
      };
    const template = catalog.find((item) => item.code === definition.templateCode);
    const subtemplate = template?.subtemplates?.find(
      (item) => item.code === definition.subtemplateCode
    );
    const defaults = subtemplate?.defaults ?? template?.defaults ?? BASE_SCENE;
    return {
      ...BASE_SCENE,
      ...defaults,
      mode: definition.mode,
      templateCode: definition.templateCode ?? defaults.templateCode,
      subtemplateCode: definition.subtemplateCode ?? defaults.subtemplateCode ?? null,
      durationSeconds: definition.durationSeconds,
      mockupId: null,
      rightsConfirmed: true,
      startFrameMode: "direct",
      studioLayout: "none",
      studioFrameId: null,
      studioPrompt: null,
      studioReferenceHashes: [],
      transitionIn: definition.transitionIn ?? "cut",
      transitionDurationFrames: definition.transitionDurationFrames ?? 0,
      standardMotionPreset: definition.standardMotionPreset ?? null,
    };
  });

const loadCharacterReference = async (character: AiCharacter) => {
  const response = await fetch(character.imageUrl);
  if (!response.ok) throw new Error(i18n.t("workflowConfig.aiShot.characterImageError", { name: character.name }));
  const image = await response.blob();
  return new File([image], `character-${character.id}.png`, {
    type: image.type || "image/png",
  });
};

function MockupOption({ asset }: { asset: MockupAsset }) {
  const { t } = useTranslation("common");
  return (
    <SelectItem value={asset.id}>
      <span className="flex min-w-0 items-center gap-2">
        <Image
          src={asset.previewUrl}
          alt=""
          width={40}
          height={40}
          unoptimized
          className="bg-background size-10 shrink-0 rounded border object-contain"
        />
        <span className="min-w-0 truncate">
          {t(`workflowMedia.assetRoles.${asset.role}`, { defaultValue: asset.role })} | {asset.width}x{asset.height} | {asset.variantKey || asset.id.slice(0, 6)}
        </span>
      </span>
    </SelectItem>
  );
}

function ReferenceImageTile({
  file,
  index,
  disabled,
  onRemove,
}: {
  file: File;
  index: number;
  disabled: boolean;
  onRemove: () => void;
}) {
  const { t } = useTranslation("common");
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <figure className="w-20 shrink-0 space-y-1" title={file.name}>
      <div className="bg-background relative size-20 overflow-hidden rounded-md border">
        {previewUrl && (
          <Image
            src={previewUrl}
            alt={t("workflowConfig.aiShot.referenceImageAlt", { index: index + 1, name: file.name })}
            fill
            sizes="80px"
            unoptimized
            className="object-contain"
          />
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={t("workflowConfig.aiShot.removeReferenceImage", { index: index + 1 })}
          onClick={onRemove}
          className="absolute top-0.5 right-0.5 size-10 rounded-full bg-black/70 text-white hover:bg-black/85 hover:text-white"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <figcaption className="text-muted-foreground truncate text-[11px]" title={file.name}>
        {file.name}
      </figcaption>
    </figure>
  );
}

export function AiShotOptions({
  nodeId,
  disabled,
  onChange,
  beforeTemplate,
  afterTemplate,
}: {
  nodeId: string;
  disabled: boolean;
  /** Fields the panel shows above the video template (the output format). */
  beforeTemplate?: ReactNode;
  /** Fields the panel shows right below the video template, above the scenes (the transition). */
  afterTemplate?: ReactNode;
  onChange: (
    scenes: AiVideoSceneOptions[],
    seconds: number,
    sharedInstructions?: string | null
  ) => void;
}) {
  const { t } = useTranslation("common");
  const dragIndex = useRef<number | null>(null);
  const referenceFileInput = useRef<HTMLInputElement | null>(null);
  const referenceUploadSceneIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedForMove, setSelectedForMove] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [preparingSceneIndex, setPreparingSceneIndex] = useState<number | null>(null);
  const [regeneratingSceneIndex, setRegeneratingSceneIndex] = useState<number | null>(null);
  const [scenePromptPreview, setScenePromptPreview] = useState<ScenePromptPreview | null>(null);
  const [isPreviewingScenePrompt, setIsPreviewingScenePrompt] = useState(false);
  const [previewFrame, setPreviewFrame] = useState<{ url: string; scene: number } | null>(null);
  const [cropEditor, setCropEditor] = useState<{ sceneIndex: number; asset: MockupAsset } | null>(null);
  const [rightsConfirmation, setRightsConfirmation] = useState<{
    sceneIndex: number;
    onConfirm: (confirmed: boolean) => void;
  } | null>(null);
  const [pendingPack, setPendingPack] = useState<VideoPackDefinition | null>(null);
  // Scene text the content check refused when the workflow was saved, marked until the seller changes it.
  const contentIssues = useWorkflowContentIssuesStore((state) => state.issues);
  const resolveContentIssue = useWorkflowContentIssuesStore((state) => state.resolve);
  const sceneContentIssue = (index: number, field: string) =>
    contentIssues.find((issue) => issue.nodeId === nodeId && issue.field === `aiScenes.${index}.${field}`)?.message;
  const [framePicker, setFramePicker] = useState<{
    sceneIndex: number;
    view: "library" | "create";
  } | null>(null);
  const [referenceFilesByScene, setReferenceFilesByScene] = useState<Record<number, File[]>>({});
  const node = useWorkflowStore((state) => state.nodes.find((item) => item.id === nodeId));
  const inputProductId = useWorkflowStore((state) =>
    readString(
      state.nodes.find((item) => item.data.type === "product-input")?.data.config.productId
    )
  );
  const { run } = useWorkflowRuntime();
  // A design's own run of a batch video run edits that design's scenes, on its own mock-ups; otherwise the scenes
  // are set up on the product in Product input.
  // Only a run of the batch run open now is a design's run: a run of an earlier (cancelled) group is another
  // design, maybe made with older mock-ups, and must not take the editor over.
  const openGroupId = useRunGroupId();
  const designRun = run?.runGroupId && run.runGroupId === openGroupId ? run : null;
  // A batch video run has no product in Product input: its scenes are set up on one of the run's designs.
  const previewDesign = usePreviewDesign();
  // Before a batch video run, the product chosen in "Video product" (its own settings); "All products" names none.
  const batchId = useWorkflowStore((state) =>
    readString(state.nodes.find((item) => item.data.type === "product-input")?.data.config.batchId)
  );
  const scopedProductId = useWorkflowStore((state) =>
    state.designScope?.kind === "product" ? state.designScope.productId : ""
  );
  const { data: batchProducts } = useBatchProducts(designRun || previewDesign ? "" : batchId);
  const allNodes = useWorkflowStore((state) => state.nodes);
  const runProducts = batchProducts ? videoRunProducts(allNodes, batchProducts) : [];
  // With one product to run there is no "Video product" choice: its images are the ones shown.
  const soleBatchProductId = runProducts.length === 1 ? runProducts[0]!.id : "";
  const productId =
    designRun?.productId ?? previewDesign?.productId ?? (scopedProductId || soleBatchProductId || inputProductId);
  // The shared settings of a batch apply to every product: a start frame is one product's image, so it is chosen
  // (and its default shown) only once a product is picked in "Video product".
  const sharedBatchSettings = Boolean(batchId) && !designRun && !previewDesign && !productId;
  const applyMockupNode = useWorkflowStore((state) =>
    state.nodes.find((item) => item.data.type === "apply-mockup")
  );
  const { data: catalog = [], isPending, isError, refetch } = useAiVideoTemplates();
  const { data: entitlements } = useEntitlements();
  const aiVideoLocked = entitlements !== undefined && !hasFeature(entitlements, "ai_video");
  const { data: videoPacks = [], isPending: arePacksLoading } = useVideoPacks();
  const {
    data: aiCharacters = [],
    isError: areCharactersError,
  } = useAiCharacterModels();
  const { data: allAssets = [], isPending: areAssetsLoading } = useMockupAssets(productId);
  const queryClient = useAppQueryClient();
  const {
    mutate: reviewStudioFrame,
    isPending: isReviewingStudioFrame,
  } = useReviewMockupAsset();
  const { saveWorkflow } = useWorkflowSave();
  const sceneRunId = run?.id ?? null;
  const { data: sceneVideos = [] } = useRunSceneVideos(sceneRunId);
  // The full video plays the AI clips already made. A batch video run opens no design's run by itself, so without an
  // open run the clips are the previewed design's (the scene actions above still need a run to be opened).
  const previewClipRunId = designRun?.id ?? previewDesign?.runId ?? sceneRunId;
  const { data: previewSceneVideos = [] } = useRunSceneVideos(previewClipRunId);
  const { mutateAsync: actOnRun } = useWorkflowRunAction();
  const { canApply: canApplyEdit, apply: applyEdit, isApplying: isApplyingEdit } = useApplyVideoEdit();
  const chosenMockupIds = designRun ? EMPTY_IDS : readStringArray(applyMockupNode?.data.config.mockupIds);
  const artworkGroupKey =
    designRun?.artworkGroupKey ??
    previewDesign?.artworkGroupKey ??
    readString(applyMockupNode?.data.config.artworkGroupKey);
  // The scenes as saved: Mockup Approval and the videos read those, so the editor says when it shows something else.
  const savedScenes = useWorkflowStore(
    (state) =>
      state.savedGraph.nodes.find((item) => item.id === nodeId)?.data.config.aiScenes as
        | AiVideoSceneOptions[]
        | undefined
  );
  const rawScenes =
    (node?.data.config.aiScenes as AiVideoSceneOptions[] | undefined) ?? EMPTY_SCENES;
  const defaultVideoModel =
    node?.data.config.aiVideoModelKey === "minimax_h3" ? "minimax_h3" : "minimax_h3_lite";
  const availableAssetIds = new Set(allAssets.map((asset) => asset.id));
  const availableArtworkGroups = new Set(
    allAssets
      .map((asset) => asset.artworkGroupKey)
      .filter((group): group is string => Boolean(group))
  );
  const effectiveChosenMockupIds = chosenMockupIds.filter((id) => availableAssetIds.has(id));
  const effectiveArtworkGroupKey = availableArtworkGroups.has(artworkGroupKey)
    ? artworkGroupKey
    : "";
  const sharedInstructions =
    AI_ADVANCED_CONTROLS_ENABLED && typeof node?.data.config.aiGlobalInstructions === "string"
      ? node.data.config.aiGlobalInstructions
      : null;
  const selectedAiCharacter = getAiCharacter(
    aiCharacters,
    readString(node?.data.config.aiCharacterModelId)
  );
  const legacyStudioMode = node?.data.config.aiStudioMode === "studio";
  const selectedPackCode = readString(node?.data.config.template);
  const selectedVideoPack = videoPacks.find((pack) => pack.code === selectedPackCode);
  // A pack of Standard scenes only: no AI, character or shared mock-up.
  const isStandardPack = Boolean(selectedVideoPack?.scenes.every((scene) => scene.mode === "standard"));
  const currentApproved = allAssets.filter(
    (asset) => asset.approvalStatus === "approved" && asset.approvedRevision === asset.revision
  );
  const referencedSceneAssetIds = new Set(
    rawScenes
      .flatMap((scene) => [scene.mockupId, scene.studioFrameId])
      .filter((id): id is string => Boolean(id))
  );
  const directSceneAssetIds = new Set(
    rawScenes
      .filter(
        (scene) =>
          scene.startFrameMode !== "studio" &&
          !(
            scene.startFrameMode == null &&
            scene.templateCode === "cinematic_product_showcase" &&
            legacyStudioMode
          )
      )
      .map((scene) => scene.mockupId)
      .filter((id): id is string => Boolean(id))
  );
  const referencedFrameSourceIds = new Set(
    currentApproved
      .filter((asset) => referencedSceneAssetIds.has(asset.id))
      .map((asset) => studioMetadata(asset)?.sourceMockupId)
      .filter((id): id is string => Boolean(id))
  );
  const allOriginalApproved = currentApproved.filter((asset) => !isStudioFrame(asset));
  const originalApproved = allOriginalApproved
    .filter(
      (asset) =>
        effectiveChosenMockupIds.length === 0 ||
        effectiveChosenMockupIds.includes(asset.id) ||
        referencedSceneAssetIds.has(asset.id) ||
        referencedFrameSourceIds.has(asset.id)
    )
    .filter(
      (asset) => !effectiveArtworkGroupKey || asset.artworkGroupKey === effectiveArtworkGroupKey
    );
  const approvedFrames = currentApproved.filter((asset) => {
    const metadata = studioMetadata(asset);
    const correctArtworkGroup =
      !effectiveArtworkGroupKey || asset.artworkGroupKey === effectiveArtworkGroupKey;
    if (metadata && directSceneAssetIds.has(asset.id)) return correctArtworkGroup;
    const source =
      metadata && allOriginalApproved.find((candidate) => candidate.id === metadata.sourceMockupId);
    const sourceAllowed =
      source &&
      (originalApproved.some((candidate) => candidate.id === source.id) ||
        effectiveChosenMockupIds.includes(asset.id) ||
        referencedSceneAssetIds.has(asset.id));
    return Boolean(
      metadata &&
        source &&
        sourceAllowed &&
        source.revision === metadata.sourceRevision &&
        correctArtworkGroup
    );
  });
  const approved = [...originalApproved, ...approvedFrames];
  const scenes: AiVideoSceneOptions[] = rawScenes.map((saved) => {
    const scene = withCurrentTemplate(saved);
    const mode: AiVideoSceneOptions["mode"] = scene.mode === "standard" ? "standard" : "ai";
    const template =
      mode === "ai" ? catalog.find((item) => item.code === scene.templateCode) : undefined;
    const migrated =
      scene.startFrameMode == null && scene.templateCode === "cinematic_product_showcase"
        ? {
            ...scene,
            startFrameMode: legacyStudioMode ? ("studio" as const) : ("direct" as const),
            studioLayout:
              scene.studioLayout ??
              (node?.data.config.aiStudioLayout === "flat_lay"
                ? ("flat_lay" as const)
                : ("hanging_window" as const)),
            studioFrameId:
              scene.studioFrameId ??
              (legacyStudioMode ? readString(node?.data.config.aiStudioFrameId) || null : null),
          }
        : scene;
    const withFrameDefaults =
      migrated.templateCode === "cinematic_product_showcase"
        ? { ...migrated, studioLayout: normalizeStudioLayout(migrated.studioLayout) }
        : migrated;
    return template
      ? normalizeTemplateSettings(withFrameDefaults, template)
      : { ...withFrameDefaults, mode };
  });
  const outputMode =
    scenes.length > 0
      ? scenes.every((scene) => scene.mode === "standard")
        ? "standard"
        : "ai_shot"
      : node?.data.config.mode;
  const outputFormat = getVideoOutputFormat(node?.data.config.outputFormat, outputMode).value;

  useEffect(() => {
    if (!node || scenes.length > 0) return;
    const legacy = node.data.config.aiShotOptions as LegacyOptions | undefined;
    // Only settings made before the scene editor become scenes. A new node starts with none: the seller adds the
    // first scene (or picks a video template) and so sets the video up rather than running a default one.
    const hasLegacyStandard =
      node.data.config.mode === "standard" &&
      (readStringArray(node.data.config.sceneOrder).length > 0 ||
        readStringArray(node.data.config.selectedMockupIds).length > 0);
    if (!legacy && !hasLegacyStandard) return;
    let migrated: AiVideoSceneOptions[];
    if (node.data.config.mode === "standard" && !legacy) {
      const configuredIds = readStringArray(node.data.config.sceneOrder);
      const selectedIds = readStringArray(node.data.config.selectedMockupIds);
      const ids = (configuredIds.length ? configuredIds : selectedIds).slice(0, 4);
      const standardConfigs = Array.isArray(node.data.config.standardScenes)
        ? node.data.config.standardScenes
        : [];
      const motionPresets = Array.isArray(node.data.config.sceneMotionPresets)
        ? node.data.config.sceneMotionPresets
        : [];
      const targetDuration = Math.min(
        MAX_VIDEO_DURATION_SECONDS,
        Math.max(MIN_VIDEO_DURATION_SECONDS, Number(node.data.config.durationSeconds ?? MIN_VIDEO_DURATION_SECONDS))
      );
      const targetCount = ids.length
        ? Math.min(4, Math.max(ids.length, Math.ceil(targetDuration / 8)))
        : 1;
      const durationTarget = targetDuration;
      const sceneIds = ids.length
        ? Array.from({ length: targetCount }, (_, index) => ids[index % ids.length]!)
        : Array.from({ length: targetCount }, () => null);
      const durations = Array.from({ length: targetCount }, () => 1);
      for (
        let remaining = Math.max(
            0,
            durationTarget - durations.reduce((sum, value) => sum + value, 0)
          ),
          index = 0;
        remaining > 0;
        index = (index + 1) % targetCount
      ) {
        if (durations[index]! >= MAX_VIDEO_DURATION_SECONDS) break;
        durations[index]! += 1;
        remaining -= 1;
      }
      migrated = sceneIds.map((id, index): AiVideoSceneOptions => {
        const framing = standardConfigs.find(
          (
            item
          ): item is {
            mockupId: string;
            baseCrop?: Region | null;
            startCrop?: Region | null;
            endCrop?: Region | null;
          } =>
            typeof item === "object" && item !== null && "mockupId" in item && item.mockupId === id
        );
        const motion = motionPresets[index];
        return {
          ...BASE_SCENE,
          mode: "standard",
          mockupId: id,
          durationSeconds: durations[index]!,
          standardMotionPreset:
            motion === "gentle"
              ? "zoom"
              : typeof motion === "string"
                ? (motion as AiVideoSceneOptions["standardMotionPreset"])
                : "zoom",
          standardBaseCrop: framing?.baseCrop ?? null,
          standardStartCrop: framing?.startCrop ?? null,
          standardEndCrop: framing?.endCrop ?? null,
        };
      });
    } else {
      const legacyTemplateCode =
        legacy?.concept === "material_detail"
          ? "macro_detail_reveal"
          : legacy?.concept === "lifestyle_motion"
            ? "lifestyle_in_use"
            : legacy?.concept === "product_in_use"
              ? "lifestyle_in_use"
              : "cinematic_product_showcase";
      migrated = convertLegacy(
        legacy,
        catalog.find((item) => item.code === legacyTemplateCode),
        Number(node.data.config.durationSeconds ?? 4)
      );
    }
    const seconds = migrated.reduce((sum, scene) => sum + scene.durationSeconds, 0);
    const { aiShotOptions: _old, ...cleanConfig } = node.data.config;
    useWorkflowStore.getState().updateNodeConfig(nodeId, {
      ...cleanConfig,
      mode: workflowModeForScenes(migrated),
      aiScenes: migrated,
      durationSeconds: seconds,
    });
    onChange(migrated, seconds, sharedInstructions);
  }, [node, nodeId, scenes.length, catalog, onChange, sharedInstructions]);

  useEffect(() => {
    // Waits for the AI template catalog too: an auto-picked start image depends on whether the scene's template
    // needs a person, and `catalog` is `[]` while that loads, which would otherwise auto-pick the main mock-up and
    // then never revisit it once a mock-up is set.
    if (!node || rawScenes.length === 0 || areAssetsLoading || !productId || isPending) return;
    let normalizedScenes: AiVideoSceneOptions[] = rawScenes.map((saved) => {
      const scene = withCurrentTemplate(saved);
      const mode: AiVideoSceneOptions["mode"] = scene.mode === "standard" ? "standard" : "ai";
      const template =
        mode === "ai" ? catalog.find((item) => item.code === scene.templateCode) : undefined;
      // Asset availability is runtime state, not configuration. Preserve the saved source ID so a
      // temporary fetch failure or an approval/filter change cannot silently erase the scene setup.
      const savedMockupId = scene.mockupId;
      const migrated =
        scene.startFrameMode == null && scene.templateCode === "cinematic_product_showcase"
          ? {
              ...scene,
              mockupId: savedMockupId,
              startFrameMode: legacyStudioMode ? ("studio" as const) : ("direct" as const),
              studioLayout:
                scene.studioLayout ??
                (node.data.config.aiStudioLayout === "flat_lay"
                  ? ("flat_lay" as const)
                  : ("hanging_window" as const)),
              studioFrameId:
                scene.studioFrameId ??
                (legacyStudioMode ? readString(node.data.config.aiStudioFrameId) || null : null),
            }
          : { ...scene, mockupId: savedMockupId };
      const withFrameDefaults =
        migrated.templateCode === "cinematic_product_showcase"
          ? { ...migrated, studioLayout: normalizeStudioLayout(migrated.studioLayout) }
          : migrated;
      const selectedFrame = withFrameDefaults.studioFrameId
        ? allAssets.find((asset) => asset.id === withFrameDefaults.studioFrameId)
        : undefined;
      const frameReferenceHashes = selectedFrame
        ? (studioMetadata(selectedFrame)?.references?.map((reference) => reference.contentHash) ??
          [])
        : [];
      const withRecoveredReferences =
        (withFrameDefaults.studioReferenceHashes?.length ?? 0) === 0 &&
        frameReferenceHashes.length > 0
          ? { ...withFrameDefaults, studioReferenceHashes: frameReferenceHashes }
          : withFrameDefaults;
      return template
        ? normalizeTemplateSettings(withRecoveredReferences, template)
        : { ...withRecoveredReferences, mode };
    });
    const normalizedMode = workflowModeForScenes(normalizedScenes);
    // Once any scene is AI, the whole config is "ai_shot" and the planner needs every scene's start image up
    // front, standard-motion scenes included: there is no per-scene fallback like Standard's main-mock-up default.
    // Fill the missing ones with the same rule the start-frame field already shows as "automatic".
    if (normalizedMode === "ai_shot") {
      normalizedScenes = normalizedScenes.map((scene) => {
        const sceneTemplate =
          scene.mode === "ai" ? catalog.find((item) => item.code === scene.templateCode) : undefined;
        if (sceneTemplate?.requiresLifestyle) {
          // A person scene only ever uses the design's model photo: the server overrides anything else the same
          // way when it renders (SceneSourceResolver), so keep this in sync instead of showing a stale choice -
          // including a mock-up that was picked before a model photo existed, or before this template was chosen.
          const current = scene.mockupId
            ? originalApproved.find((asset) => asset.id === scene.mockupId)
            : undefined;
          if (current?.role === "Lifestyle") return scene;
          const person = personMockup(originalApproved);
          return person ? { ...scene, mockupId: person.id } : { ...scene, mockupId: null };
        }
        if (scene.mockupId) return scene;
        const auto = mainMockup(originalApproved);
        return auto ? { ...scene, mockupId: auto.id } : scene;
      });
    }
    const needsNormalization =
      node.data.config.mode !== normalizedMode ||
      rawScenes.some(
        (scene, index) =>
          scene.mode !== normalizedScenes[index]?.mode ||
          (scene.mode !== "standard" &&
            TEMPLATE_SETTING_FIELDS.some(
              (field) => scene[field] !== normalizedScenes[index]?.[field]
            )) ||
          scene.templateCode !== normalizedScenes[index]?.templateCode ||
          scene.subtemplateCode !== normalizedScenes[index]?.subtemplateCode ||
          (scene.templateCode === "cinematic_product_showcase" && scene.startFrameMode == null) ||
          (scene.templateCode === "cinematic_product_showcase" &&
            scene.studioLayout !== normalizedScenes[index]?.studioLayout) ||
          scene.mockupId !== normalizedScenes[index]?.mockupId ||
          scene.extraInstructions !== normalizedScenes[index]?.extraInstructions ||
          (scene.studioReferenceHashes ?? []).join("|") !==
            (normalizedScenes[index]?.studioReferenceHashes ?? []).join("|")
      ) ||
      node.data.config.aiGlobalInstructions !== sharedInstructions;
    if (!needsNormalization) return;
    const seconds = normalizedScenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
    const normalizedConfig = {
      ...node.data.config,
      mode: normalizedMode,
      aiScenes: normalizedScenes,
      aiGlobalInstructions: sharedInstructions,
      durationSeconds: seconds,
    };
    const store = useWorkflowStore.getState();
    // Picking a product only fills in its default start images (what the server picks for it anyway): that is not
    // a change of its settings, so it neither asks to be saved nor gives the product settings of its own.
    const scope = store.designScope;
    const untouchedProduct = scope?.kind === "product" && sameConfig(node.data.config, scope.baseConfig);
    // Opening the panel fills in defaults (empty instructions, start images, template settings): that is not a change of
    // the seller's, so on a workflow with nothing unsaved it does not make it unsaved. Otherwise Continue at Mockup
    // Approval, which needs the saved workflow, would lock just because the seller looked at Generate Video. Changing
    // the video mode is different (it changes how the saved settings are read), so it still has to be saved.
    if (node.data.config.mode === normalizedMode) store.normalizeNodeConfig(nodeId, normalizedConfig);
    else store.updateNodeConfig(nodeId, normalizedConfig);
    onChange(normalizedScenes, seconds, sharedInstructions);
    if (untouchedProduct) store.markDesignSaved(useWorkflowStore.getState().nodes.find((item) => item.id === nodeId)?.data.config ?? normalizedConfig);
  }, [
    node,
    nodeId,
    rawScenes,
    catalog,
    onChange,
    sharedInstructions,
    legacyStudioMode,
    originalApproved,
    approvedFrames,
    allAssets,
    areAssetsLoading,
    productId,
    isPending,
  ]);

  if (!node) return null;
  const update = (
    next: AiVideoSceneOptions[],
    nextSharedInstructions: string | null = sharedInstructions
  ) => {
    const effectiveSharedInstructions = AI_ADVANCED_CONTROLS_ENABLED
      ? nextSharedInstructions
      : null;
    const seconds = next.reduce((sum, scene) => sum + scene.durationSeconds, 0);
    const { aiShotOptions: _old, ...cleanConfig } = node.data.config;
    const mode = workflowModeForScenes(next);
    useWorkflowStore.getState().updateNodeConfig(nodeId, {
      ...cleanConfig,
      // The server only knows a pack by name for Standard scenes: one that gained an AI scene is custom scenes now.
      ...(isStandardPack && mode === "ai_shot" ? { template: "auto", templateVersion: 2 } : {}),
      mode,
      aiScenes: next,
      aiGlobalInstructions: effectiveSharedInstructions,
      durationSeconds: seconds,
    });
    onChange(next, seconds, effectiveSharedInstructions);
  };
  const openScenePromptPreview = async (sceneOrder: number) => {
    if (!run || !node) return;
    const currentNode = useWorkflowStore
      .getState()
      .nodes.find((item) => item.id === nodeId);
    const parsed = generateVideoConfigSchema.safeParse(currentNode?.data.config ?? node.data.config);
    if (!parsed.success) {
      showToast("warning", parsed.error.issues[0]?.message ?? t("workflowConfig.aiShot.checkSceneSettings"));
      return;
    }

    setScenePromptPreview({ sceneOrder, config: parsed.data });
    setIsPreviewingScenePrompt(true);
    try {
      const storyboard = await previewVideoStoryboard({
        productId: run.productId,
        config: parsed.data,
        mockupIds: effectiveChosenMockupIds,
        artworkGroupKey: effectiveArtworkGroupKey,
        // One design's run of a batch: its scenes take that design's images on the server, not the ones set up on the canvas.
        forDesign: Boolean(designRun),
      });
      const shot = storyboard.aiShots?.find((item) => item.sceneOrder === sceneOrder);
      if (!shot) {
        setScenePromptPreview(null);
        showToast("error", t("workflowConfig.aiShot.compilePromptFailed", { scene: sceneOrder + 1 }));
        return;
      }
      setScenePromptPreview({
        sceneOrder,
        config: parsed.data,
        prompt: shot.prompt,
        model: shot.model,
        durationSeconds: shot.durationSeconds,
      });
    } catch (error) {
      setScenePromptPreview(null);
      showToast("error", getErrorMessage(error));
    } finally {
      setIsPreviewingScenePrompt(false);
    }
  };
  const generateScene = async (preview: ScenePromptPreview) => {
    if (!run || !preview.prompt) return;
    const { sceneOrder, config } = preview;
    const existingScene = sceneVideos.find((clip) => clip.sceneOrder === sceneOrder);
    setRegeneratingSceneIndex(sceneOrder);
    try {
      const token = await confirmAiShot(run.id, config, true, sceneOrder);
      if (token === null) return;
      setScenePromptPreview(null);
      queryClient.setQueryData<AiSceneVideo[]>(videoWorkflowKeys.sceneVideos(run.id), (current) =>
        current?.some((clip) => clip.sceneOrder === sceneOrder)
          ? current.map((clip) =>
              clip.sceneOrder === sceneOrder
                ? { ...clip, status: "pending", previewUrl: null, failure: null }
                : clip
            )
          : [...(current ?? []), { sceneOrder, status: "pending", previewUrl: null, failure: null }]
      );
      await actOnRun({
        runId: run.id,
        expectedRevision: run.revision,
        action: "regenerate_ai_shot",
        config,
        aiShotQuoteToken: token,
        sceneOrder,
      });
      showToast(
        "success",
        existingScene
          ? t("workflowConfig.aiShot.sceneRegenerating", { scene: sceneOrder + 1 })
          : t("workflowConfig.aiShot.sceneGenerating", { scene: sceneOrder + 1 })
      );
    } catch (error) {
      void queryClient.invalidateQueries({ queryKey: videoWorkflowKeys.sceneVideos(run.id) });
      showToast("error", getErrorMessage(error));
    } finally {
      setRegeneratingSceneIndex(null);
    }
  };
  const prepareStudioFrame = async (
    sceneIndex: number,
    regenerate = false,
    rightsConfirmed = false
  ) => {
    const scene = scenes[sceneIndex];
    const sources = originalApproved;
    const source = scene?.mockupId
      ? sources.find((asset) => asset.id === scene.mockupId)
      : undefined;
    if (!scene || !source || !productId) return;
    if (!selectedAiCharacter) {
      showToast(
        "error",
        areCharactersError
          ? t("workflowConfig.aiShot.sharedModelCatalogError")
          : t("workflowConfig.aiShot.noSharedModel")
      );
      return;
    }
    const layout = normalizeStudioLayout(scene.studioLayout);
    setPreparingSceneIndex(sceneIndex);
    try {
      const characterReference = await loadCharacterReference(selectedAiCharacter);
      const manualReferences = referenceFilesByScene[sceneIndex] ?? [];
      const customPrompt = [
        `Use user reference 1 as the one on-camera adult. Match that person's identity, facial features, body proportions, hair and skin tone; do not retain a different person from the product image.`,
        scene.studioPrompt?.trim(),
      ]
        .filter(Boolean)
        .join(" ");
      const request = {
        productId,
        sourceMockupId: source.id,
        layout,
        outputFormat,
        customPrompt,
        templateCode: scene.templateCode,
        references: [characterReference, ...manualReferences],
        referenceRightsConfirmed: scene.rightsConfirmed || rightsConfirmed,
        regenerate,
      };
      const quote = await quoteAiStudioFrame(request);
      if (quote.existingFrame) {
        const frame = quote.existingFrame;
        queryClient.setQueryData<MockupAsset[]>(videoWorkflowKeys.assets(productId), (old) => [
          frame,
          ...(old ?? []).filter((asset) => asset.id !== frame.id),
        ]);
        persistScene(sceneIndex, {
          startFrameMode: "studio",
          mockupId: source.id,
          rightsConfirmed: scene.rightsConfirmed || rightsConfirmed,
          studioLayout: layout,
          studioFrameId: frame.id,
          standardBaseCrop: null,
          standardStartCrop: null,
          standardEndCrop: null,
          standardStartScale: null,
          standardEndScale: null,
          standardStartRotation: null,
          standardEndRotation: null,
          studioReferenceHashes:
            studioMetadata(frame)?.references?.map((reference) => reference.contentHash) ?? [],
        });
        showToast(
          "success",
          frame.approvalStatus === "approved" && frame.approvedRevision === frame.revision
            ? t("workflowConfig.aiShot.matchingApprovedKeyframe")
            : t("workflowConfig.aiShot.matchingKeyframeFound")
        );
        return;
      }
      const estimate = quote.estimatedCostUsd.toFixed(2);
      const confirmed = window.confirm(
        t("workflowConfig.aiShot.confirmKeyframeCost", { estimate })
      );
      if (!confirmed) return;
      const result = await generateAiStudioFrame({
        ...request,
        expectedFingerprint: quote.fingerprint,
        confirmedEstimatedCostUsd: quote.estimatedCostUsd,
      });
      const frame = result.frame;
      queryClient.setQueryData<MockupAsset[]>(videoWorkflowKeys.assets(productId), (old) => [
        frame,
        ...(old ?? []).filter((asset) => asset.id !== frame.id),
      ]);
      persistScene(sceneIndex, {
        startFrameMode: "studio",
        mockupId: source.id,
        rightsConfirmed: scene.rightsConfirmed || rightsConfirmed,
        studioLayout: layout,
        studioFrameId: frame.id,
        standardBaseCrop: null,
        standardStartCrop: null,
        standardEndCrop: null,
        standardStartScale: null,
        standardEndScale: null,
        standardStartRotation: null,
        standardEndRotation: null,
        studioReferenceHashes:
          studioMetadata(frame)?.references?.map((reference) => reference.contentHash) ?? [],
      });
      showToast(
        "success",
        t("workflowConfig.aiShot.keyframeCreated", { cost: result.estimatedCostUsd.toFixed(2) })
      );
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setPreparingSceneIndex(null);
    }
  };
  const changeScene = (index: number, changes: Partial<AiVideoSceneOptions>) =>
    update(scenes.map((scene, position) => {
      if (position !== index) return scene;
      const next = { ...scene, ...changes };
      const previousSource = scene.startFrameMode === "studio" ? scene.studioFrameId : scene.mockupId;
      const nextSource = next.startFrameMode === "studio" ? next.studioFrameId : next.mockupId;
      return previousSource === nextSource ? next : { ...next, aiStartFrameCrop: null };
    }));
  const requestSceneRightsConfirmation = (
    sceneIndex: number,
    onConfirm: (confirmed: boolean) => void
  ) => {
    const scene = scenes[sceneIndex];
    const template = scene && catalog.find((item) => item.code === scene.templateCode);
    if (!scene || !template?.requiresLifestyle || scene.rightsConfirmed) {
      onConfirm(Boolean(scene?.rightsConfirmed));
      return;
    }
    setRightsConfirmation({ sceneIndex, onConfirm });
  };
  const confirmSceneRights = () => {
    if (!rightsConfirmation) return;
    const { sceneIndex, onConfirm } = rightsConfirmation;
    changeScene(sceneIndex, { rightsConfirmed: true, studioFrameId: null });
    setRightsConfirmation(null);
    onConfirm(true);
  };
  const persistScene = (index: number, changes: Partial<AiVideoSceneOptions>) => {
    changeScene(index, changes);
    queueMicrotask(() => saveWorkflow());
  };
  const writePackConfiguration = (
    nextScenes: AiVideoSceneOptions[],
    changes: Partial<GenerateVideoConfig> = {}
  ) => {
    const seconds = nextScenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
    const currentNode = useWorkflowStore.getState().nodes.find((item) => item.id === nodeId);
    // A shared mock-up was the start-frame source of an older Product on Model pack; scenes now use their own images.
    const { aiShotOptions: _legacy, sharedMockupId: _shared, ...cleanConfig } = currentNode?.data.config ?? node.data.config;
    useWorkflowStore.getState().updateNodeConfig(nodeId, {
      ...cleanConfig,
      ...changes,
      mode: workflowModeForScenes(nextScenes),
      aiScenes: nextScenes,
      durationSeconds: seconds,
      aiGlobalInstructions: null,
    });
    onChange(nextScenes, seconds, null);
  };
  const applyVideoPack = (pack: VideoPackDefinition) => {
    const nextScenes = buildProductOnModelScenes(pack, catalog);
    const standardOnly = nextScenes.every((scene) => scene.mode === "standard");
    writePackConfiguration(nextScenes, {
      mode: standardOnly ? "standard" : "ai_shot",
      template: pack.code,
      templateVersion: pack.version,
    });
    setPendingPack(null);
    queueMicrotask(() => saveWorkflow());
    showToast("success", t("workflowConfig.aiShot.packAdded", { name: pack.name, sceneCount: nextScenes.length }));
  };
  const requestVideoPack = (pack: VideoPackDefinition) => {
    if (catalog.length === 0 && pack.scenes.some((scene) => scene.mode !== "standard")) {
      showToast("error", t("workflowConfig.aiShot.catalogLoading"));
      return;
    }
    const hasExistingWork = scenes.some(
      (scene) => scene.studioFrameId || scene.mockupId || scene.durationSeconds > 1
    );
    if (hasExistingWork) {
      setPendingPack(pack);
      return;
    }
    applyVideoPack(pack);
  };
  const chooseReferenceFile = (sceneIndex: number) => {
    referenceUploadSceneIndex.current = sceneIndex;
    referenceFileInput.current?.click();
  };
  const handleReferenceFile = (file: File | undefined) => {
    const sceneIndex = referenceUploadSceneIndex.current;
    referenceUploadSceneIndex.current = null;
    if (!file || sceneIndex === null) return;
    const references = referenceFilesByScene[sceneIndex] ?? [];
    if (
      references.length >= 2 ||
      file.size > 20 * 1024 * 1024 ||
      references.reduce((sum, item) => sum + item.size, file.size) > 20 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      showToast(
        "error",
        t("workflowConfig.aiShot.invalidReferenceFile")
      );
      return;
    }
    setReferenceFilesByScene((current) => ({ ...current, [sceneIndex]: [...references, file] }));
    changeScene(sceneIndex, { studioFrameId: null, studioReferenceHashes: [] });
  };
  const removeReferenceFile = (sceneIndex: number, referenceIndex: number) => {
    setReferenceFilesByScene((current) => ({
      ...current,
      [sceneIndex]: (current[sceneIndex] ?? []).filter(
        (_, position) => position !== referenceIndex
      ),
    }));
    changeScene(sceneIndex, { studioFrameId: null, studioReferenceHashes: [] });
  };
  const moveScene = (index: number, nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= scenes.length) return;
    const next = [...scenes];
    const [moved] = next.splice(index, 1);
    next.splice(nextIndex, 0, moved!);
    setReferenceFilesByScene((current) => {
      const files = scenes.map((_, position) => current[position] ?? []);
      const [movedFiles] = files.splice(index, 1);
      files.splice(nextIndex, 0, movedFiles ?? []);
      return Object.fromEntries(files.map((value, position) => [position, value]));
    });
    update(next);
    setAnnouncement(t("workflowConfig.aiShot.sceneMoved", { position: nextIndex + 1, total: scenes.length }));
  };
  const totalSeconds = scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
  const aiSceneSeconds = scenes.reduce(
    (sum, scene) => sum + (scene.mode === "ai" ? scene.durationSeconds : 0),
    0
  );
  const aiSceneCost = scenes.reduce((sum, scene) => sum + (scene.mode === "ai"
    ? scene.durationSeconds * ((scene.aiVideoModelKey ?? defaultVideoModel) === "minimax_h3_lite" ? 0.04 : 0.08)
    : 0), 0);
  const hasAiScenes = aiSceneSeconds > 0;
  const copyScene = (index: number) => {
    const scene = scenes[index];
    if (!scene || scenes.length >= 4 || totalSeconds + scene.durationSeconds > MAX_VIDEO_DURATION_SECONDS) return;
    setReferenceFilesByScene((current) => {
      const files = scenes.map((_, position) => current[position] ?? []);
      files.splice(index + 1, 0, [...(files[index] ?? [])]);
      return Object.fromEntries(files.map((value, position) => [position, value]));
    });
    update([...scenes.slice(0, index + 1), { ...scene }, ...scenes.slice(index + 1)]);
  };
  const removeScene = (index: number) => {
    setReferenceFilesByScene((current) => {
      const files = scenes.map((_, position) => current[position] ?? []);
      files.splice(index, 1);
      return Object.fromEntries(files.map((value, position) => [position, value]));
    });
    update(scenes.filter((_, position) => position !== index));
  };
  const addScene = () => {
    if (
      scenes.length >= 4 ||
      scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0) + 1 > MAX_VIDEO_DURATION_SECONDS
    )
      return;
    const definition = catalog.find((item) => item.code === "cinematic_product_showcase");
    const nextScene: AiVideoSceneOptions = {
      ...BASE_SCENE,
      ...(definition?.defaults ?? {}),
      mode: "standard",
      // The first scene is the whole video, so it starts at the shortest video allowed; later ones split the rest.
      durationSeconds: scenes.length === 0 ? MIN_VIDEO_DURATION_SECONDS : 1,
      mockupId: null,
      extraInstructions: null,
      rightsConfirmed: false,
    };
    update([...scenes, nextScene]);
  };
  const isPackCustomized = Boolean(
    selectedVideoPack &&
      (scenes.length !== selectedVideoPack.scenes.length ||
        scenes.some((scene, index) => {
          const definition = selectedVideoPack.scenes[index];
          return (
            !definition ||
            scene.mode !== definition.mode ||
            (definition.mode !== "standard" &&
              (scene.templateCode !== definition.templateCode || scene.subtemplateCode !== definition.subtemplateCode)) ||
            (definition.mode === "standard" && (scene.standardMotionPreset ?? null) !== (definition.standardMotionPreset ?? null)) ||
            scene.durationSeconds !== definition.durationSeconds ||
            scene.transitionIn !== (definition.transitionIn ?? "cut")
          );
        }))
  );
  type TemplateOption = VideoTemplateOption;
  const templateOptions: TemplateOption[] = [
    {
      code: "custom",
      name: t("workflowConfig.aiShot.startFromScratch"),
      meta: null,
      description: scenes.length > 0 ? t("workflowConfig.aiShot.startFromScratchKeep") : t("workflowConfig.aiShot.startFromScratchDescription"),
      tag: null,
    },
    ...videoPacks.map((pack): TemplateOption => {
      const usesAi = pack.scenes.some((scene) => scene.mode !== "standard");
      return {
        code: pack.code,
        name: pack.name,
        meta: t("workflowConfig.aiShot.packMeta", { count: pack.scenes.length, seconds: pack.totalDurationSeconds }),
        description: pack.description,
        tag: usesAi ? { label: t("workflowConfig.aiShot.tagAiVideo"), ai: true } : { label: t("workflowConfig.aiShot.tagPhotoMotion"), ai: false },
        pack,
      };
    }),
  ];
  const currentTemplate =
    templateOptions.find((option) => option.code === (selectedVideoPack ? selectedVideoPack.code : "custom")) ??
    templateOptions[0]!;
  const templatesLoading = arePacksLoading || isPending;
  const chooseTemplate = (option: TemplateOption) => {
    if (option.code === currentTemplate.code) {
      setPendingPack(null);
      return;
    }
    if (!option.pack) {
      setPendingPack(null);
      writePackConfiguration(scenes, { template: "auto", templateVersion: 2 });
      return;
    }
    // Replacing scenes the seller already set up is confirmed just below the list (see `pendingPack`).
    requestVideoPack(option.pack);
  };

  const roleLabel = (role: string) => t(`workflowMedia.assetRoles.${role}`, { defaultValue: role });

  return (
    <>
      {beforeTemplate}
      <section className="space-y-2" aria-labelledby="video-template-heading">
        <div>
          <p id="video-template-heading" className="text-sm font-semibold">
            {t("workflowConfig.aiShot.startFromTemplate")}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            {t("workflowConfig.aiShot.startFromTemplateDescription")}
          </p>
        </div>
        <VideoTemplateList
          options={templateOptions}
          selectedCode={currentTemplate.code}
          pendingCode={pendingPack?.code}
          customized={isPackCustomized}
          loading={templatesLoading}
          disabled={disabled}
          onChoose={chooseTemplate}
        />
        {/* Replacing scenes the seller already set up is confirmed in a dialog before anything changes. */}
        <Dialog
          open={pendingPack !== null}
          onOpenChange={(open) => {
            if (!open) setPendingPack(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {pendingPack &&
                  t("workflowConfig.aiShot.replaceScenesQuestion", { count: scenes.length, name: pendingPack.name })}
              </DialogTitle>
              <DialogDescription>{t("workflowConfig.aiShot.replaceScenesDetail")}</DialogDescription>
            </DialogHeader>
            {pendingPack && (
              <div className="bg-muted/40 flex items-center gap-3 rounded-lg border p-3">
                <VideoTemplateThumbnail
                  code={pendingPack.code}
                  ai={pendingPack.scenes.some((scene) => scene.mode !== "standard")}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{pendingPack.name}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {t("workflowConfig.aiShot.packMeta", {
                      count: pendingPack.scenes.length,
                      seconds: pendingPack.totalDurationSeconds,
                    })}
                  </p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{pendingPack.description}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPendingPack(null)}>
                {t("workflowConfig.aiShot.keepCurrentScenes")}
              </Button>
              <Button type="button" onClick={() => pendingPack && applyVideoPack(pendingPack)}>
                {t("workflowConfig.aiShot.replaceScenes")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {selectedVideoPack && isPackCustomized && (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {t("workflowConfig.aiShot.packCustomizedNote")}
          </p>
        )}
      </section>
      {afterTemplate}
      {sharedBatchSettings && scenes.length > 0 && (
        <p className="text-muted-foreground bg-muted/30 rounded-lg border border-dashed p-3 text-xs leading-relaxed">
          {t("workflowConfig.aiShot.sharedStartFramesNote", {
            image: scenes.some((scene) => scene.mode === "ai" && scene.templateCode === "lifestyle_in_use")
              ? t("workflowConfig.aiShot.sharedStartFramesLifestyle")
              : t("workflowConfig.aiShot.sharedStartFramesDefault"),
          })}
        </p>
      )}
      <section className="space-y-3" aria-label={t("workflowConfig.aiShot.sceneSetup")}>
        <input
          ref={referenceFileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            handleReferenceFile(file);
          }}
        />
        <Dialog
          open={scenePromptPreview !== null}
          onOpenChange={(open) => {
            if (!open && regeneratingSceneIndex === null) {
              setScenePromptPreview(null);
            }
          }}
        >
          <DialogContent
            className="max-h-[85dvh] max-w-2xl overflow-hidden"
            showCloseButton={regeneratingSceneIndex === null}
          >
            <DialogHeader>
              <DialogTitle>
                {t("workflowConfig.aiShot.reviewPromptTitle", { scene: (scenePromptPreview?.sceneOrder ?? 0) + 1 })}
              </DialogTitle>
              <DialogDescription>
                {t("workflowConfig.aiShot.reviewPromptDescription")}
              </DialogDescription>
            </DialogHeader>
            {isPreviewingScenePrompt || !scenePromptPreview?.prompt ? (
              <div className="space-y-3" aria-busy="true" aria-live="polite">
                <p className="text-muted-foreground text-sm">{t("workflowConfig.aiShot.compilingPrompt")}</p>
                <div className="bg-muted h-4 animate-pulse rounded" />
                <div className="bg-muted h-4 animate-pulse rounded" />
                <div className="bg-muted h-24 animate-pulse rounded" />
              </div>
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted/50 rounded-md border px-3 py-2">
                    <dt className="text-muted-foreground text-xs">{t("workflowConfig.aiShot.model")}</dt>
                    <dd className="mt-0.5 font-medium">{scenePromptPreview.model}</dd>
                  </div>
                  <div className="bg-muted/50 rounded-md border px-3 py-2">
                    <dt className="text-muted-foreground text-xs">{t("workflowConfig.aiShot.duration")}</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">
                      {scenePromptPreview.durationSeconds}s
                    </dd>
                  </div>
                </dl>
                <div className="bg-muted/30 max-h-[45dvh] overflow-y-auto rounded-md border p-3">
                  <p className="font-mono text-xs leading-relaxed wrap-anywhere whitespace-pre-wrap">
                    {scenePromptPreview.prompt}
                  </p>
                </div>
              </>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={regeneratingSceneIndex !== null}
                onClick={() => setScenePromptPreview(null)}
              >
                {t("workflowConfig.aiShot.back")}
              </Button>
              <Button
                type="button"
                disabled={
                  isPreviewingScenePrompt ||
                  !scenePromptPreview?.prompt ||
                  regeneratingSceneIndex !== null
                }
                onClick={() => scenePromptPreview && void generateScene(scenePromptPreview)}
              >
                {regeneratingSceneIndex !== null
                  ? t("workflowConfig.aiShot.starting")
                  : sceneVideos.some((clip) => clip.sceneOrder === scenePromptPreview?.sceneOrder)
                    ? t("workflowConfig.aiShot.regenerateThisScene")
                    : t("workflowConfig.aiShot.generateThisScene")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="space-y-2">
          <div>
            <p className="text-sm font-semibold">{t("workflowConfig.aiShot.scenes")}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {t("workflowConfig.aiShot.scenesDescription")}
            </p>
          </div>
          <div
            className="bg-background flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border px-3 py-2"
            aria-label={t("workflowConfig.aiShot.totalDurationAria", { total: totalSeconds, max: MAX_VIDEO_DURATION_SECONDS })}
          >
            <p className="text-foreground text-sm font-semibold whitespace-nowrap tabular-nums">
              {t("workflowConfig.aiShot.totalDuration", { total: totalSeconds, max: MAX_VIDEO_DURATION_SECONDS })}
            </p>
            <div
              role="progressbar"
              aria-label={t("workflowConfig.aiShot.totalVideoDuration")}
              aria-valuemin={0}
              aria-valuemax={MAX_VIDEO_DURATION_SECONDS}
              aria-valuenow={Math.min(totalSeconds, MAX_VIDEO_DURATION_SECONDS)}
              aria-valuetext={t("workflowConfig.aiShot.durationValueText", { total: totalSeconds, max: MAX_VIDEO_DURATION_SECONDS })}
              className="bg-muted h-2 min-w-12 flex-1 basis-16 overflow-hidden rounded-full"
            >
              <div
                className="h-full rounded-full bg-teal-600 transition-[width] duration-200"
                style={{ width: `${Math.min((totalSeconds / MAX_VIDEO_DURATION_SECONDS) * 100, 100)}%` }}
              />
            </div>
            <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
              {t("workflowConfig.aiShot.sceneCount", { count: scenes.length })}
            </span>
          </div>
        </div>
        {hasAiScenes && AI_ADVANCED_CONTROLS_ENABLED && (
          <label className="block space-y-1 text-xs font-medium">
            {t("workflowConfig.aiShot.sharedDirection")}{" "}
            <span className="text-muted-foreground font-normal">
              {t("workflowConfig.aiShot.optionalUpTo500")}
            </span>
            <textarea
              disabled={disabled}
              maxLength={500}
              value={sharedInstructions ?? ""}
              onChange={(event) =>
                update(scenes, event.target.value.trim() ? event.target.value : null)
              }
              placeholder="E.g. maintain a warm, premium studio look throughout; keep the artwork facing the camera."
              className="bg-background min-h-16 w-full rounded-md border p-2 text-sm font-normal"
            />
            <span className="text-muted-foreground block text-right text-[11px] font-normal">
              {t("workflowConfig.aiShot.sharedDirectionCounter", { length: sharedInstructions?.length ?? 0 })}
            </span>
          </label>
        )}
        {hasAiScenes && isPending && (
          <p className="text-muted-foreground text-xs">{t("workflowConfig.aiShot.loadingAiTemplates")}</p>
        )}
        {hasAiScenes && isError && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
            <span>{t("workflowConfig.aiShot.catalogError")}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
              {t("workflowConfig.aiShot.retry")}
            </Button>
          </div>
        )}
        <div className="sr-only" role="status" aria-live="polite">
          {announcement}
        </div>
        {scenes.map((scene, index) => {
          const template =
            scene.mode === "standard"
              ? undefined
              : catalog.find((item) => item.code === scene.templateCode);
          const subtemplate = template ? resolveSubtemplate(scene, template) : undefined;
          const sources = scene.startFrameMode === "studio" ? originalApproved : approved;
          // A style with a person (Product On Model) only ever starts from a model photo: the server swaps any other
          // image for one (SceneSourceResolver), so the picker offers only those, and keyframes made from them.
          const needsModelPhoto = Boolean(template?.requiresLifestyle);
          const isModelPhoto = (asset: MockupAsset) => {
            const source = studioMetadata(asset)?.sourceMockupId;
            return (source ? allAssets.find((item) => item.id === source) : asset)?.role === "Lifestyle";
          };
          const pickableFrames = needsModelPhoto ? approved.filter(isModelPhoto) : approved;
          const hasRequiredSource = sources.length > 0;
          const selectedSource = scene.mockupId
            ? sources.find((asset) => asset.id === scene.mockupId)
            : undefined;
          const selectedStudioSource = scene.mockupId
            ? originalApproved.find((asset) => asset.id === scene.mockupId)
            : undefined;
          const selectedStudioSourceValue = selectedStudioSource?.id ?? "";
          const sceneFrame = allAssets.find((asset) => asset.id === scene.studioFrameId);
          const studioLayout = normalizeStudioLayout(scene.studioLayout);
          const sceneReferenceFiles = referenceFilesByScene[index] ?? [];
          const sceneReferenceHashes = normalizeReferenceHashes(scene.studioReferenceHashes);
          const currentScenePrompt = scene.studioPrompt?.trim() ?? "";
          const expectedPromptVersion = studioLayout === "none" && currentScenePrompt ? 10 : 9;
          const outputAspect = getVideoOutputFormat(outputFormat).aspectRatio;
          const reusableStudioFrames = allAssets.filter((frame) => {
            const metadata = studioMetadata(frame);
            const original =
              metadata && allOriginalApproved.find((asset) => asset.id === metadata.sourceMockupId);
            const metadataReferences = metadata?.references ?? [];
            const referencesMatch =
              metadataReferences.length === sceneReferenceHashes.length &&
              metadataReferences.every(
                (reference, referenceIndex) =>
                  reference.contentHash === sceneReferenceHashes[referenceIndex]
              );
            const promptMatches =
              metadata?.promptVersion === expectedPromptVersion &&
              (metadata.customPrompt ?? "") === currentScenePrompt &&
              (metadata.templateCode ?? "") === scene.templateCode &&
              referencesMatch;
            return (
              frame.sourceType === "ai_generated" &&
              !!metadata &&
              frame.approvalStatus === "approved" &&
              frame.approvedRevision === frame.revision &&
              promptMatches &&
              ["hanging_window", "flat_lay", "none"].includes(metadata?.layout ?? "") &&
              metadata?.aspectRatio === outputAspect &&
              originalApproved.some((asset) => asset.id === metadata.sourceMockupId) &&
              !!original &&
              original.revision === metadata.sourceRevision
            );
          });
          const selectedSourceFrame = reusableStudioFrames.find(
            (frame) => frame.id === scene.studioFrameId
          );
          const sceneFrameMetadata = sceneFrame && studioMetadata(sceneFrame);
          const pendingFrameReferencesMatch =
            (sceneFrameMetadata?.references ?? []).length === sceneReferenceHashes.length &&
            (sceneFrameMetadata?.references ?? []).every(
              (reference, referenceIndex) =>
                reference.contentHash === sceneReferenceHashes[referenceIndex]
            );
          const pendingFrameMatches = Boolean(
            selectedStudioSource &&
              sceneFrame &&
              sceneFrame.approvalStatus === "pending" &&
              sceneFrameMetadata &&
              sceneFrameMetadata.sourceMockupId === selectedStudioSource.id &&
              sceneFrameMetadata.sourceRevision === selectedStudioSource.revision &&
              sceneFrameMetadata.aspectRatio === outputAspect &&
              sceneFrameMetadata.promptVersion === expectedPromptVersion &&
              (sceneFrameMetadata.customPrompt ?? "") === currentScenePrompt &&
              sceneFrameMetadata.templateCode === scene.templateCode &&
              pendingFrameReferencesMatch
          );
          const hasSceneKeyframe = Boolean(
            (sceneFrame && sceneFrame.approvalStatus !== "rejected") ||
              pendingFrameMatches ||
              (selectedSourceFrame &&
                reusableStudioFrames.some((frame) => frame.id === selectedSourceFrame.id)) ||
              (selectedStudioSource &&
                reusableStudioFrames.some(
                  (frame) => studioMetadata(frame)?.sourceMockupId === selectedStudioSource.id
                ))
          );
          const matchingReusableFrame =
            selectedSourceFrame ??
            reusableStudioFrames.find(
              (frame) => studioMetadata(frame)?.sourceMockupId === selectedStudioSource?.id
            );
          const frameIsCurrentAndApproved = Boolean(
            sceneFrame?.approvalStatus === "approved" &&
              sceneFrame.approvedRevision === sceneFrame.revision
          );
          const keyframeToUse =
            frameIsCurrentAndApproved || pendingFrameMatches
              ? sceneFrame
              : (matchingReusableFrame ??
                (sceneFrame?.approvalStatus !== "rejected" ? sceneFrame : undefined));
          const keyframeCanBeUsed = Boolean(
            keyframeToUse?.approvalStatus === "approved" &&
              keyframeToUse.approvedRevision === keyframeToUse.revision &&
              (keyframeToUse.id !== sceneFrame?.id || frameIsCurrentAndApproved)
          );
          // A scene with no start frame chosen starts from its design's main mock-up (Standard), or from its model
          // photo when the AI template shows a person (Product On Model, Creator POV, Everyday Story): show that
          // image instead of an empty slot, so the editor says what the video will use.
          const automaticSource = scene.mockupId
            ? undefined
            : scene.mode === "standard"
              ? mainMockup(originalApproved)
              : template?.requiresLifestyle
                ? personMockup(originalApproved)
                : undefined;
          const automaticSourceIsPerson = Boolean(automaticSource) && scene.mode !== "standard";
          // A start frame saved from another design of a batch run is not among this design's images: show the one
          // this design gets for it (the server's pick for the saved workflow, else the same template and color).
          // The server resolved this design's image from the saved scene; while this scene is as saved, that is
          // exactly the image Mockup Approval marks and the video uses, so it is the one shown.
          const savedScene = savedScenes?.[index];
          const sceneIsSaved = Boolean(
            savedScene && savedScene.mode === scene.mode && (savedScene.mockupId ?? null) === (scene.mockupId ?? null)
          );
          const serverPick = sceneIsSaved
            ? previewDesign?.scenes.find((preview) => preview.sceneIndex === index)?.mockupId
            : undefined;
          const serverSource = serverPick ? originalApproved.find((asset) => asset.id === serverPick) : undefined;
          const matchedSource =
            !selectedSource && scene.mockupId && scene.mode === "standard"
              ? (serverSource ??
                counterpartMockup(scene.mockupId, allAssets, originalApproved) ??
                mainMockup(originalApproved))
              : undefined;
          const shownSource = selectedSource ?? matchedSource ?? (automaticSource && (serverSource ?? automaticSource));
          const unsavedForRun = Boolean(previewDesign && scene.mode === "standard" && !sceneIsSaved);
          const selectedStartFrame = selectedSourceFrame ?? shownSource;
          // The part of the start frame the video shows. A Standard scene that keeps the whole image (contain)
          // has no crop; AI starts from the crop the seller set, else the format's own cut of the image.
          const thumbnailCrop = !selectedStartFrame
            ? null
            : scene.mode === "ai"
              ? (scene.aiStartFrameCrop ?? getStandardBaseCrop(selectedStartFrame, outputAspect))
              : scene.standardMotionPreset === "contain_gentle"
                ? null
                : (scene.standardBaseCrop ?? getStandardBaseCrop(selectedStartFrame, outputAspect));
          const editableAiFrame = scene.mode === "ai"
            ? scene.startFrameMode === "studio"
              ? sceneFrame?.approvalStatus === "approved" && sceneFrame.approvedRevision === sceneFrame.revision
                ? sceneFrame : undefined
              : selectedSource
            : undefined;
          const otherDuration = totalSeconds - scene.durationSeconds;
          const maxDuration =
            scene.mode === "standard"
              ? Math.max(1, MAX_VIDEO_DURATION_SECONDS - otherDuration)
              : Math.min(MAX_VIDEO_DURATION_SECONDS, MAX_VIDEO_DURATION_SECONDS - otherDuration);
          const canDuplicate = scenes.length < 4 && totalSeconds + scene.durationSeconds <= MAX_VIDEO_DURATION_SECONDS;
          const sceneVideo = sceneVideos.find((clip) => clip.sceneOrder === index);
          const generateRunNode = run?.nodes.find((item) => item.nodeType === "generate-video");
          const waitingForVideoGeneration = Boolean(
            sceneRunId &&
              !sceneVideo &&
              generateRunNode &&
              ["pending", "running"].includes(generateRunNode.status)
          );
          const otherAiScenesAreStored = scenes.every(
            (otherScene, otherIndex) =>
              otherIndex === index ||
              otherScene.mode === "standard" ||
              sceneVideos.some((clip) => clip.sceneOrder === otherIndex && clip.status === "stored")
          );
          const canRegenerateScene = Boolean(
            run &&
              (["waiting_for_review", "waiting_for_input", "failed"].includes(run.status) ||
                (run.status === "cancelled" && generateRunNode?.status === "succeeded" &&
                  sceneVideo?.status === "stored" && otherAiScenesAreStored)) &&
              sceneVideo &&
              ["stored", "failed"].includes(sceneVideo.status) &&
              regeneratingSceneIndex === null
          );
          const canGenerateScene = Boolean(
            run &&
              !sceneVideo &&
              otherAiScenesAreStored &&
              ["waiting_for_review", "waiting_for_input", "failed"].includes(run.status) &&
              regeneratingSceneIndex === null
          );
          const frameStatusLabel =
            preparingSceneIndex === index
              ? t("workflowConfig.aiShot.keyframeStatus.generating")
              : sceneFrame?.approvalStatus === "pending"
                ? t("workflowConfig.aiShot.keyframeStatus.pendingApproval")
                : frameIsCurrentAndApproved
                  ? t("workflowConfig.aiShot.keyframeStatus.ready")
                  : sceneFrame?.approvalStatus === "approved"
                    ? t("workflowConfig.aiShot.keyframeStatus.needsUpdate")
                    : t("workflowConfig.aiShot.keyframeStatus.rejected");
          const frameStatusClass =
            preparingSceneIndex === index
              ? "bg-muted text-muted-foreground"
              : sceneFrame?.approvalStatus === "pending"
                ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                : frameIsCurrentAndApproved
                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200"
                  : "bg-destructive/10 text-destructive";
          const selectSceneKeyframe = (rightsConfirmed = scene.rightsConfirmed) => {
            if (!keyframeToUse) return;
            const metadata = studioMetadata(keyframeToUse);
            persistScene(index, {
              startFrameMode: "studio",
              mockupId: metadata?.sourceMockupId ?? selectedStudioSource?.id ?? scene.mockupId,
              studioLayout:
                (metadata?.layout as "hanging_window" | "flat_lay" | "none" | undefined) ??
                studioLayout,
              studioFrameId: keyframeToUse.id,
              rightsConfirmed,
              standardBaseCrop: null,
              standardStartCrop: null,
              standardEndCrop: null,
              standardStartScale: null,
              standardEndScale: null,
              standardStartRotation: null,
              standardEndRotation: null,
              studioReferenceHashes:
                metadata?.references?.map((reference) => reference.contentHash) ?? [],
            });
            showToast(
              "success",
              keyframeToUse.approvalStatus === "pending"
                ? t("workflowConfig.aiShot.keyframeSelectedPending")
                : t("workflowConfig.aiShot.keyframeSelected")
            );
          };
          return (
            <article
              key={`ai-scene-${index}`}
              onDragOver={(event) => {
                if (dragIndex.current !== null) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                const from = Number(event.dataTransfer.getData("text/plain"));
                if (Number.isInteger(from)) moveScene(from, index);
                dragIndex.current = null;
                setDragOverIndex(null);
              }}
              className={`bg-background space-y-3 rounded-lg border p-3 transition-colors ${dragOverIndex === index || selectedForMove === index ? "border-primary ring-primary/20 ring-2" : ""}`}
            >
              <header className="flex flex-wrap items-center gap-2">
                <h3 className="bg-background flex size-7 items-center justify-center rounded-md border text-sm font-semibold tabular-nums">
                  <span className="sr-only">{t("workflowConfig.aiShot.sceneSrPrefix")}</span>
                  {index + 1}
                </h3>
                {aiVideoLocked && scene.mode !== "standard" && (
                  <Badge
                    variant="outline"
                    className="gap-1 text-[10px]"
                    title={t("workflowConfig.aiShot.aiVideoNotInPlan")}
                  >
                    <Lock className="size-3" aria-hidden="true" /> Pro
                  </Badge>
                )}
                <div className="flex max-w-56 min-w-32 flex-1 basis-36 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("workflowConfig.aiShot.decreaseDurationAria", { scene: index + 1 })}
                    disabled={
                      disabled || scene.durationSeconds <= (scene.mode === "standard" ? 1 : 4)
                    }
                    onClick={() =>
                      changeScene(index, {
                        durationSeconds: Math.max(
                          scene.mode === "standard" ? 1 : 4,
                          scene.durationSeconds - 1
                        ),
                      })
                    }
                  >
                    <Minus aria-hidden="true" />
                  </Button>
                  <input
                    type="range"
                    min={scene.mode === "standard" ? 1 : 4}
                    max={maxDuration}
                    step={1}
                    value={scene.durationSeconds}
                    disabled={disabled}
                    aria-label={t("workflowConfig.aiShot.sceneDurationAria", { scene: index + 1 })}
                    onChange={(event) =>
                      changeScene(index, { durationSeconds: Number(event.target.value) })
                    }
                    className="accent-primary h-2 min-w-0 flex-1 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("workflowConfig.aiShot.increaseDurationAria", { scene: index + 1 })}
                    disabled={disabled || scene.durationSeconds >= maxDuration}
                    onClick={() =>
                      changeScene(index, {
                        durationSeconds: Math.min(maxDuration, scene.durationSeconds + 1),
                      })
                    }
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                  <span className="min-w-8 text-right text-xs font-semibold tabular-nums">
                    {scene.durationSeconds}s
                  </span>
                </div>
                <div className="ml-auto flex shrink-0 items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="cursor-grab active:cursor-grabbing"
                    aria-label={t("workflowConfig.aiShot.dragSceneAria", { scene: index + 1 })}
                    title={t("workflowConfig.aiShot.reorderTitle")}
                    disabled={disabled}
                    draggable={!disabled}
                    onDragStart={(event) => {
                      dragIndex.current = index;
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", String(index));
                      setDragOverIndex(index);
                    }}
                    onDragEnter={() => setDragOverIndex(index)}
                    onDragEnd={() => {
                      dragIndex.current = null;
                      setDragOverIndex(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowUp" && index > 0) {
                        event.preventDefault();
                        moveScene(index, index - 1);
                      }
                      if (event.key === "ArrowDown" && index < scenes.length - 1) {
                        event.preventDefault();
                        moveScene(index, index + 1);
                      }
                    }}
                    onClick={() => {
                      if (selectedForMove === null) {
                        setSelectedForMove(index);
                        setAnnouncement(
                          t("workflowConfig.aiShot.sceneSelectedForMove", { scene: index + 1 })
                        );
                      } else if (selectedForMove === index) {
                        setSelectedForMove(null);
                        setAnnouncement(t("workflowConfig.aiShot.sceneMoveCancelled"));
                      } else {
                        moveScene(selectedForMove, index);
                        setSelectedForMove(null);
                      }
                    }}
                  >
                    <GripVertical aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("workflowConfig.aiShot.copySceneAria", { scene: index + 1 })}
                    title={t("workflowConfig.aiShot.copyScene")}
                    disabled={disabled || !canDuplicate}
                    onClick={() => copyScene(index)}
                  >
                    <Copy aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("workflowConfig.aiShot.removeSceneAria", { scene: index + 1 })}
                    disabled={disabled || scenes.length <= 1}
                    onClick={() => removeScene(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </header>
              {/* How the scene is made, below the header so each choice can say what it does. */}
              {(() => {
                const aiUnavailable = otherDuration + 4 > MAX_VIDEO_DURATION_SECONDS;
                const chooseMode = (mode: "standard" | "ai") => {
                  if (mode === scene.mode) return;
                  if (mode === "standard") {
                    changeScene(index, {
                      mode: "standard",
                      durationSeconds: Math.min(scene.durationSeconds, MAX_VIDEO_DURATION_SECONDS - otherDuration),
                      standardMotionPreset:
                        scene.standardMotionPreset === "gentle" ? "zoom" : (scene.standardMotionPreset ?? "zoom"),
                    });
                    return;
                  }
                  const maxAiDuration = Math.min(MAX_VIDEO_DURATION_SECONDS, MAX_VIDEO_DURATION_SECONDS - otherDuration);
                  if (maxAiDuration < 4) return;
                  const aiDuration = Math.min(
                    maxAiDuration,
                    Math.max(4, scene.durationSeconds, MIN_VIDEO_DURATION_SECONDS - otherDuration)
                  );
                  changeScene(index, { mode: "ai", durationSeconds: aiDuration });
                };
                const modes = [
                  {
                    value: "standard" as const,
                    icon: ImageIcon,
                    title: t("workflowConfig.aiShot.photoMotion"),
                    description: t("workflowConfig.aiShot.photoMotionDescription"),
                    unavailable: false,
                  },
                  {
                    value: "ai" as const,
                    icon: Sparkles,
                    title: t("workflowConfig.aiShot.aiVideo"),
                    description: aiUnavailable ? t("workflowConfig.aiShot.aiVideoNeedsSeconds") : t("workflowConfig.aiShot.aiVideoDescription"),
                    unavailable: aiUnavailable || aiVideoLocked,
                  },
                ];
                return (
                  <div
                    role="radiogroup"
                    aria-label={t("workflowConfig.aiShot.generationModeAria", { scene: index + 1 })}
                    className="grid gap-2 @min-[22rem]:grid-cols-2"
                  >
                    {modes.map((mode) => {
                      const selected = (scene.mode ?? "standard") === mode.value;
                      const Icon = mode.icon;
                      return (
                        <button
                          key={mode.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={disabled || (!selected && mode.unavailable)}
                          onClick={() => chooseMode(mode.value)}
                          className={`focus-visible:ring-ring flex min-w-0 items-start gap-2.5 rounded-md border p-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                        >
                          <span
                            className={`grid size-7 shrink-0 place-items-center rounded-md ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                          >
                            <Icon aria-hidden="true" className="size-3.5" />
                          </span>
                          <span className="min-w-0 space-y-0.5">
                            <span className="flex items-center gap-1.5 text-sm font-semibold">
                              {mode.title}
                              {mode.value === "ai" && aiVideoLocked && (
                                <Badge variant="outline" className="gap-1 text-[10px]" title={t("workflowConfig.aiShot.notInPlan")}>
                                  <Lock className="size-3" aria-hidden="true" /> Pro
                                </Badge>
                              )}
                            </span>
                            <span className="text-muted-foreground block text-xs leading-snug">{mode.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
              {scene.mode === "ai" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{t("workflowConfig.aiShot.aiVideoModel")}</span>
                    <span className="text-muted-foreground text-[11px]">{t("workflowConfig.aiShot.choosePerScene")}</span>
                  </div>
                  <div
                    className="grid grid-cols-2 gap-2"
                    role="group"
                    aria-label={t("workflowConfig.aiShot.aiVideoModelAria", { scene: index + 1 })}
                  >
                    {([
                      { value: "minimax_h3_lite", label: "MiniMax-H3 Lite", isDefault: true },
                      { value: "minimax_h3", label: "MiniMax-H3", isDefault: false },
                    ] as const).map((option) => {
                      const selected = (scene.aiVideoModelKey ?? defaultVideoModel) === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={disabled}
                          aria-pressed={selected}
                          onClick={() => changeScene(index, { aiVideoModelKey: option.value })}
                          className={`focus-visible:ring-ring min-h-12 rounded-md border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                            selected
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                        >
                          <span className="block text-xs font-semibold">{option.label}</span>
                          {option.isDefault && (
                            <span className="text-muted-foreground mt-0.5 block text-[10px] font-normal">
                              {t("workflowConfig.aiShot.default")}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {scene.mode !== "standard" && (
                <label className="flex flex-col gap-2 text-xs font-medium">
                  <span>{t("workflowConfig.aiShot.aiTemplate")}</span>
                  <Select
                    disabled={disabled || isPending || catalog.length === 0}
                    value={scene.templateCode}
                    onValueChange={(value) => {
                      const nextTemplate = catalog.find((item) => item.code === value);
                      if (!nextTemplate) return;
                      const approvedFrame =
                        sceneFrame?.approvalStatus === "approved" &&
                        sceneFrame.approvedRevision === sceneFrame.revision
                          ? sceneFrame
                          : undefined;
                      persistScene(index, {
                        ...nextTemplate.defaults,
                        mode: "ai",
                        templateCode: nextTemplate.code,
                        subtemplateCode:
                          nextTemplate.defaults.subtemplateCode ??
                          nextTemplate.defaultSubtemplateCode ??
                          null,
                        extraInstructions: null,
                        // A prompt the seller rewrote belongs to the template it was written from.
                        customPrompt: null,
                        rightsConfirmed: nextTemplate.requiresLifestyle
                          ? scene.rightsConfirmed
                          : false,
                        startFrameMode: approvedFrame ? "direct" : scene.startFrameMode,
                        mockupId: approvedFrame?.id ?? scene.mockupId,
                        studioLayout: scene.studioLayout,
                        studioFrameId: approvedFrame ? null : scene.studioFrameId,
                        studioPrompt: scene.studioPrompt,
                        studioReferenceHashes: scene.studioReferenceHashes,
                      });
                    }}
                  >
                    <SelectTrigger aria-label={t("workflowConfig.aiShot.aiTemplateAria", { scene: index + 1 })}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.map((item) => (
                        <SelectItem key={item.code} value={item.code}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              )}
              {template && (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {template.description}
                </p>
              )}
              {template?.subtemplates && template.subtemplates.length > 0 && (
                <div className="bg-muted/20 space-y-2 rounded-md border p-3">
                  <label className="flex flex-col gap-2 text-xs font-medium">
                    <span>{t("workflowConfig.aiShot.shotTemplate")}</span>
                    <Select
                      disabled={disabled || isPending}
                      value={subtemplate?.code}
                      onValueChange={(value) => {
                        const nextSubtemplate = template.subtemplates?.find(
                          (item) => item.code === value
                        );
                        if (!nextSubtemplate) return;
                        persistScene(index, {
                          ...nextSubtemplate.defaults,
                          mode: "ai",
                          templateCode: template.code,
                          subtemplateCode: nextSubtemplate.code,
                          durationSeconds: scene.durationSeconds,
                          mockupId: scene.mockupId,
                          rightsConfirmed: scene.rightsConfirmed,
                          startFrameMode: scene.startFrameMode,
                          studioLayout: scene.studioLayout,
                          studioFrameId: null,
                          studioPrompt:
                            nextSubtemplate.startFramePrompt ?? scene.studioPrompt,
                          studioReferenceHashes: [],
                          customPrompt: null,
                        });
                      }}
                    >
                      <SelectTrigger aria-label={t("workflowConfig.aiShot.shotTemplateAria", { scene: index + 1 })}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {template.subtemplates.map((item) => (
                          <SelectItem key={item.code} value={item.code}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  {subtemplate && (
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {subtemplate.description}
                    </p>
                  )}
                </div>
              )}
              {!sharedBatchSettings && (
                <section
                  className="space-y-3 rounded-md border p-3"
                  aria-label={t("workflowConfig.aiShot.startFrameAria", { scene: index + 1 })}
                >
                <div>
                  <p className="text-sm font-semibold">{t("workflowConfig.aiShot.startFrame")}</p>
                  <p className="text-muted-foreground mt-1 max-w-md text-xs leading-relaxed">
                    {t("workflowConfig.aiShot.startFrameDescription")}
                  </p>
                </div>
                <div className="bg-background relative rounded-lg">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setFramePicker({ sceneIndex: index, view: "library" })}
                  aria-label={selectedStartFrame ? t("workflowConfig.aiShot.changeStartFrameAria", { scene: index + 1 }) : t("workflowConfig.aiShot.chooseStartFrameAria", { scene: index + 1 })}
                  className="hover:bg-muted/40 focus-visible:ring-ring group flex min-h-24 w-full cursor-pointer items-center gap-3 rounded-lg p-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {selectedStartFrame ? (
                    // The thumbnail has the shape of the output format and shows the part of the image the video
                    // starts from: the AI crop the seller set, else the frame the format cuts out of the image.
                    <span
                      className="bg-muted relative block h-[72px] shrink-0 overflow-hidden rounded-md border"
                      style={{ aspectRatio: outputAspect.replace(":", " / ") }}
                    >
                      {thumbnailCrop ? (
                        <Image
                          src={selectedStartFrame.previewUrl}
                          alt=""
                          width={selectedStartFrame.width}
                          height={selectedStartFrame.height}
                          sizes="128px"
                          unoptimized
                          className="pointer-events-none absolute max-w-none select-none"
                          style={{
                            width: `${100 / thumbnailCrop.width}%`,
                            height: `${100 / thumbnailCrop.height}%`,
                            left: `${(-100 * thumbnailCrop.x) / thumbnailCrop.width}%`,
                            top: `${(-100 * thumbnailCrop.y) / thumbnailCrop.height}%`,
                          }}
                        />
                      ) : (
                        <Image
                          src={selectedStartFrame.previewUrl}
                          alt=""
                          fill
                          sizes="128px"
                          unoptimized
                          className="object-contain"
                        />
                      )}
                    </span>
                  ) : (
                    <span
                      className="bg-muted text-muted-foreground flex h-[72px] shrink-0 items-center justify-center rounded-md border border-dashed"
                      style={{ aspectRatio: outputAspect.replace(":", " / ") }}
                    >
                      <Plus aria-hidden="true" className="size-5" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {automaticSource && !selectedSource
                        ? automaticSourceIsPerson
                          ? t("workflowConfig.aiShot.modelPhotoAutomatic")
                          : t("workflowConfig.aiShot.mainMockupAutomatic")
                        : selectedStartFrame
                          ? t("workflowConfig.aiShot.selectedImage")
                          : t("workflowConfig.aiShot.chooseAStartFrame")}
                    </span>
                    <span className="text-muted-foreground mt-1 block truncate text-xs">
                      {selectedSourceFrame
                        ? t("workflowConfig.aiShot.approvedKeyframeRevision", { revision: selectedSourceFrame.revision })
                        : shownSource
                          ? `${roleLabel(shownSource.role)} · ${shownSource.width} × ${shownSource.height}${shownSource.variantKey ? ` · ${shownSource.variantKey}` : ""}`
                          : t("workflowConfig.aiShot.browseApproved")}
                    </span>
                    {automaticSource && !selectedSource && !selectedSourceFrame && (
                      <span className="text-muted-foreground mt-0.5 block text-[11px] leading-snug">
                        {automaticSourceIsPerson
                          ? t("workflowConfig.aiShot.automaticModelPhotoNote")
                          : t("workflowConfig.aiShot.automaticMainMockupNote")}
                      </span>
                    )}
                    {matchedSource && !selectedSourceFrame && (
                      <span className="text-muted-foreground mt-0.5 block text-[11px] leading-snug">
                        {t("workflowConfig.aiShot.matchedSourceNote")}
                      </span>
                    )}
                    {unsavedForRun && (
                      <span className="mt-0.5 block text-[11px] leading-snug font-medium text-amber-700">
                        {t("workflowConfig.aiShot.notSavedYet")}
                      </span>
                    )}
                    {scene.mode === "ai" && scene.aiStartFrameCrop && (
                      <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <Check aria-hidden="true" className="size-3 shrink-0" /> {t("workflowConfig.aiShot.cropApplied")}
                      </span>
                    )}
                    <span className={`text-primary mt-1 block text-xs font-semibold ${editableAiFrame ? "pr-16" : ""}`}>
                      {selectedStartFrame ? t("workflowConfig.aiShot.change") : t("workflowConfig.aiShot.choose")}
                    </span>
                  </span>
                </button>
                {editableAiFrame && (
                    <span className="absolute inset-y-0 right-2 flex items-center">
                      <Button type="button" variant="ghost" size="sm" aria-label={t("workflowConfig.aiShot.editStartFrame")} className={`text-muted-foreground hover:text-foreground gap-1.5 px-2.5 text-xs shadow-none hover:translate-y-0 ${scene.aiStartFrameCrop ? "h-8" : "h-9"}`} disabled={disabled} onClick={() => setCropEditor({ sceneIndex: index, asset: editableAiFrame })}>
                        <Pencil aria-hidden="true" className="size-3.5" /> {t("workflowConfig.aiShot.edit")}
                      </Button>
                    </span>
                )}
                </div>

                <Dialog
                  open={framePicker?.sceneIndex === index}
                  onOpenChange={(open) => {
                    if (!open) setFramePicker(null);
                  }}
                >
                  <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0">
                    <DialogHeader className="border-b px-5 pt-5 pb-4 text-left">
                      <DialogTitle>{t("workflowConfig.aiShot.chooseStartFrame")}</DialogTitle>
                      <DialogDescription>
                        {t("workflowConfig.aiShot.chooseStartFrameDescription", { scene: index + 1 })}
                      </DialogDescription>
                    </DialogHeader>
                    <div
                      className="border-b px-5 pt-3"
                      role="tablist"
                      aria-label={t("workflowConfig.aiShot.startFrameOptions")}
                    >
                      <div className="flex gap-5">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={framePicker?.view === "library"}
                          onClick={() => setFramePicker({ sceneIndex: index, view: "library" })}
                          className={`focus-visible:ring-ring min-h-11 border-b-2 px-0.5 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none ${
                            framePicker?.view === "library"
                              ? "border-primary text-foreground"
                              : "text-muted-foreground hover:text-foreground border-transparent"
                          }`}
                        >
                          {t("workflowConfig.aiShot.approvedFrames")}
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={framePicker?.view === "create"}
                          onClick={() => setFramePicker({ sceneIndex: index, view: "create" })}
                          className={`focus-visible:ring-ring min-h-11 border-b-2 px-0.5 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none ${
                            framePicker?.view === "create"
                              ? "border-primary text-foreground"
                              : "text-muted-foreground hover:text-foreground border-transparent"
                          }`}
                        >
                          {t("workflowConfig.aiShot.createNewKeyframe")}
                        </button>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-5">
                      {framePicker?.view === "library" ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold">{t("workflowConfig.aiShot.approvedFrames")}</p>
                            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                              {needsModelPhoto
                                ? t("workflowConfig.aiShot.lifestyleFramesDescription", { name: template?.name ?? t("workflowConfig.aiShot.thisStyle") })
                                : t("workflowConfig.aiShot.approvedFramesDescription")}
                            </p>
                          </div>
                          {pickableFrames.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {pickableFrames.map((asset) => {
                                const reusableFrame = reusableStudioFrames.find(
                                  (frame) => frame.id === asset.id
                                );
                                const metadata = reusableFrame && studioMetadata(reusableFrame);
                                const isSelected = reusableFrame
                                  ? selectedSourceFrame?.id === asset.id
                                  : !selectedSourceFrame && selectedSource?.id === asset.id;
                                const isGeneratedFrame = isStudioFrame(asset);

                                return (
                                  <button
                                    key={asset.id}
                                    type="button"
                                    disabled={disabled}
                                    aria-pressed={isSelected}
                                    aria-label={t("workflowConfig.aiShot.useSourceAria", { source: isGeneratedFrame ? t("workflowConfig.aiShot.approvedKeyframeLower") : roleLabel(asset.role), variant: asset.variantKey || asset.id.slice(0, 6), scene: index + 1 })}
                                    onClick={() => {
                                      if (reusableFrame) {
                                        persistScene(index, {
                                          startFrameMode: "studio",
                                          mockupId: metadata?.sourceMockupId ?? null,
                                          studioFrameId: reusableFrame.id,
                                          standardBaseCrop: null,
                                          standardStartCrop: null,
                                          standardEndCrop: null,
                                          standardStartScale: null,
                                          standardEndScale: null,
                                          standardStartRotation: null,
                                          standardEndRotation: null,
                                          ...(metadata && {
                                            studioLayout: metadata.layout as
                                              | "hanging_window"
                                              | "flat_lay"
                                              | "none",
                                          }),
                                        });
                                      } else {
                                        persistScene(index, {
                                          startFrameMode: "direct",
                                          mockupId: asset.id,
                                          studioFrameId: null,
                                          standardBaseCrop: null,
                                          standardStartCrop: null,
                                          standardEndCrop: null,
                                          standardStartScale: null,
                                          standardEndScale: null,
                                          standardStartRotation: null,
                                          standardEndRotation: null,
                                        });
                                      }
                                      setFramePicker(null);
                                    }}
                                    className={`focus-visible:ring-ring group relative aspect-[3/4] min-h-52 cursor-pointer overflow-hidden rounded-xl border text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none ${
                                      isSelected
                                        ? "border-primary ring-primary/30 shadow-primary/10 ring-2"
                                        : "hover:border-foreground/30"
                                    }`}
                                  >
                                    <span className="bg-muted absolute inset-0 overflow-hidden">
                                      <Image
                                        src={asset.previewUrl}
                                        alt=""
                                        fill
                                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 280px"
                                        unoptimized
                                        className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
                                      />
                                    </span>
                                    <span
                                      aria-hidden="true"
                                      className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 via-black/35 to-transparent"
                                    />
                                    {isSelected && (
                                      <span className="bg-primary text-primary-foreground absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-full border border-white/30 shadow-md">
                                        <Check aria-hidden="true" className="size-4" />
                                      </span>
                                    )}
                                    <span className="absolute right-3 bottom-3 left-3 text-white">
                                      <span
                                        className="block truncate text-sm font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                                        title={isGeneratedFrame ? t("workflowConfig.aiShot.approvedKeyframe") : roleLabel(asset.role)}
                                      >
                                        {isGeneratedFrame ? t("workflowConfig.aiShot.approvedKeyframe") : roleLabel(asset.role)}
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="bg-muted/30 flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
                              <p className="text-sm font-semibold">
                                {needsModelPhoto ? t("workflowConfig.aiShot.noLifestyleImage") : t("workflowConfig.aiShot.noApprovedFrames")}
                              </p>
                              <p className="text-muted-foreground mt-1 max-w-sm text-xs leading-relaxed">
                                {needsModelPhoto
                                  ? t("workflowConfig.aiShot.noLifestyleImageDescription")
                                  : t("workflowConfig.aiShot.noApprovedFramesDescription")}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {selectedStudioSource?.role === "Lifestyle" && (
                            <p className="text-muted-foreground text-xs">
                              {t("workflowConfig.aiShot.lifestyleNote")}
                            </p>
                          )}
                          <label className="flex flex-col gap-2 text-xs font-medium">
                            <span>
                              {t("workflowConfig.aiShot.approvedProductImage")}{" "}
                              <span className="text-muted-foreground font-normal">{t("workflowConfig.aiShot.required")}</span>
                            </span>
                            <Select
                              disabled={disabled || originalApproved.length === 0}
                              value={selectedStudioSourceValue}
                              onValueChange={(value) => {
                                persistScene(index, {
                                  startFrameMode: "studio",
                                  mockupId: value,
                                  studioFrameId: null,
                                  standardBaseCrop: null,
                                  standardStartCrop: null,
                                  standardEndCrop: null,
                                  standardStartScale: null,
                                  standardEndScale: null,
                                  standardStartRotation: null,
                                  standardEndRotation: null,
                                  studioReferenceHashes: [],
                                });
                              }}
                            >
                              <SelectTrigger
                                aria-label={t("workflowConfig.aiShot.mockupSourceAria", { scene: index + 1 })}
                                aria-required="true"
                              >
                                <SelectValue placeholder={t("workflowConfig.aiShot.selectAnImage")} />
                              </SelectTrigger>
                              <SelectContent>
                                {originalApproved.map((asset) => (
                                  <MockupOption key={asset.id} asset={asset} />
                                ))}
                              </SelectContent>
                            </Select>
                          </label>
                          <label className="block space-y-1.5 text-xs font-medium">
                            <span className="flex items-baseline justify-between gap-3">
                              <span className={cn(sceneContentIssue(index, "studioPrompt") && "text-destructive")}>
                                {t("workflowConfig.aiShot.customKeyframePrompt")}{" "}
                                <span className="text-muted-foreground font-normal">
                                  {t("workflowConfig.aiShot.optional")}
                                </span>
                              </span>
                              <span className="text-muted-foreground shrink-0 text-[11px] font-normal tabular-nums">
                                {scene.studioPrompt?.length ?? 0}/500
                              </span>
                            </span>
                            <textarea
                              disabled={disabled}
                              maxLength={500}
                              value={scene.studioPrompt ?? ""}
                              onChange={(event) => {
                                changeScene(index, {
                                  studioPrompt: event.currentTarget.value || null,
                                  studioFrameId: null,
                                });
                                if (sceneContentIssue(index, "studioPrompt")) resolveContentIssue(nodeId, `aiScenes.${index}.studioPrompt`);
                              }}
                              placeholder={t("workflowConfig.aiShot.keyframePromptPlaceholder")}
                              aria-invalid={sceneContentIssue(index, "studioPrompt") ? true : undefined}
                              className={cn(
                                "bg-background min-h-24 w-full resize-y rounded-md border p-2.5 text-sm leading-relaxed font-normal",
                                sceneContentIssue(index, "studioPrompt") && CONTENT_ISSUE_CLASS
                              )}
                            />
                            {sceneContentIssue(index, "studioPrompt") && (
                              <ContentIssueMessage message={sceneContentIssue(index, "studioPrompt")!} />
                            )}
                          </label>
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium">
                              {t("workflowConfig.aiShot.referenceImages")}{" "}
                              <span className="text-muted-foreground font-normal tabular-nums">
                                {t("workflowConfig.aiShot.referenceImagesHint", { selected: sceneReferenceFiles.length })}
                              </span>
                            </p>
                            <div className="flex flex-wrap items-start gap-2">
                              {sceneReferenceFiles.map((file, referenceIndex) => (
                                <ReferenceImageTile
                                  key={`${file.name}-${referenceIndex}`}
                                  file={file}
                                  index={referenceIndex + 1}
                                  disabled={disabled}
                                  onRemove={() => removeReferenceFile(index, referenceIndex)}
                                />
                              ))}
                              {sceneReferenceFiles.length < 2 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={disabled}
                                  onClick={() => chooseReferenceFile(index)}
                                  aria-label={t("workflowConfig.aiShot.addReferenceImageAria", { index: sceneReferenceFiles.length + 1 })}
                                  className="text-muted-foreground hover:text-foreground flex size-20 shrink-0 flex-col gap-1 rounded-md border-dashed p-2"
                                >
                                  <Plus aria-hidden="true" className="size-5" />
                                  <span className="text-[11px] font-medium">{t("workflowConfig.aiShot.addImage")}</span>
                                </Button>
                              )}
                            </div>
                          </div>
                          {(sceneFrame || preparingSceneIndex === index) && (
                            <section
                              className="bg-muted/40 space-y-3 rounded-md p-3"
                              aria-label={t("workflowConfig.aiShot.keyframeResultAria", { scene: index + 1 })}
                              aria-live="polite"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-semibold">{t("workflowConfig.aiShot.keyframePreview")}</p>
                                <span
                                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${frameStatusClass}`}
                                >
                                  {frameStatusLabel}
                                  {sceneFrame && preparingSceneIndex !== index
                                    ? ` · r${sceneFrame.revision}`
                                    : ""}
                                </span>
                              </div>
                              <div className="grid min-w-0 gap-3 @min-[36rem]:grid-cols-[7rem_minmax(0,1fr)]">
                                {preparingSceneIndex === index ? (
                                  <div
                                    role="status"
                                    aria-label={t("workflowConfig.aiShot.generatingKeyframePreview")}
                                    className="bg-muted aspect-[9/16] w-28 animate-pulse rounded-md"
                                  >
                                    <span className="sr-only">{t("workflowConfig.aiShot.generatingKeyframe")}</span>
                                  </div>
                                ) : (
                                  sceneFrame && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewFrame({
                                          url: sceneFrame.previewUrl,
                                          scene: index + 1,
                                        })
                                      }
                                      aria-label={t("workflowConfig.aiShot.viewKeyframeAria", { scene: index + 1 })}
                                      title={t("workflowConfig.aiShot.viewKeyframe")}
                                      className="bg-background focus-visible:ring-ring relative aspect-[9/16] w-28 cursor-zoom-in overflow-hidden rounded-md focus-visible:ring-2 focus-visible:ring-offset-2"
                                    >
                                      <Image
                                        src={sceneFrame.previewUrl}
                                        alt={t("workflowConfig.aiShot.keyframePreviewAlt", { scene: index + 1 })}
                                        fill
                                        sizes="112px"
                                        unoptimized
                                        className="object-contain"
                                      />
                                    </button>
                                  )
                                )}
                                <div className="min-w-0 self-center text-xs">
                                  {preparingSceneIndex === index ? (
                                    <>
                                      <p className="font-medium">{t("workflowConfig.aiShot.creatingKeyframe")}</p>
                                      <p className="text-muted-foreground mt-1 leading-relaxed">
                                        {t("workflowConfig.aiShot.creatingKeyframeDescription")}
                                      </p>
                                    </>
                                  ) : (
                                    sceneFrame && (
                                      <>
                                        <p className="font-medium">{t("workflowConfig.aiShot.generatedKeyframe")}</p>
                                        <p className="text-muted-foreground mt-1 leading-relaxed">
                                          {sceneFrame.approvalStatus === "pending"
                                            ? t("workflowConfig.aiShot.keyframePendingNote")
                                            : frameIsCurrentAndApproved
                                              ? t("workflowConfig.aiShot.keyframeApprovedNote")
                                              : sceneFrame.approvalStatus === "approved"
                                                ? t("workflowConfig.aiShot.keyframeOutdatedNote")
                                                : t("workflowConfig.aiShot.keyframeRejectedNote")}
                                        </p>
                                        {sceneFrame.approvalStatus === "pending" && (
                                          <div className="mt-3 flex flex-wrap gap-2">
                                            <Button
                                              type="button"
                                              size="sm"
                                              disabled={disabled || isReviewingStudioFrame}
                                              onClick={() =>
                                                reviewStudioFrame({
                                                  id: sceneFrame.id,
                                                  revision: sceneFrame.revision,
                                                  approved: true,
                                                })
                                              }
                                            >
                                              {t("workflowConfig.aiShot.approve")}
                                            </Button>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              disabled={disabled || isReviewingStudioFrame}
                                              onClick={() =>
                                                reviewStudioFrame({
                                                  id: sceneFrame.id,
                                                  revision: sceneFrame.revision,
                                                  approved: false,
                                                })
                                              }
                                            >
                                              {t("workflowConfig.aiShot.reject")}
                                            </Button>
                                          </div>
                                        )}
                                      </>
                                    )
                                  )}
                                </div>
                              </div>
                            </section>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              disabled={
                                disabled ||
                                !selectedStudioSource ||
                                preparingSceneIndex !== null ||
                                (hasSceneKeyframe && !keyframeCanBeUsed)
                              }
                              onClick={() =>
                                requestSceneRightsConfirmation(index, (rightsConfirmed) => {
                                  if (hasSceneKeyframe) {
                                    selectSceneKeyframe(rightsConfirmed || scene.rightsConfirmed);
                                    setFramePicker(null);
                                    return;
                                  }
                                  void prepareStudioFrame(index, false, rightsConfirmed);
                                })
                              }
                              className="min-h-9 gap-2 px-4 font-semibold"
                            >
                              {preparingSceneIndex === index ? (
                                <>
                                  <span
                                    className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
                                    aria-hidden="true"
                                  />
                                  {t("workflowConfig.aiShot.generatingKeyframe")}
                                </>
                              ) : hasSceneKeyframe ? (
                                <>
                                  <Check aria-hidden="true" />
                                  {t("workflowConfig.aiShot.useKeyframe")}
                                </>
                              ) : (
                                <>
                                  <Sparkles aria-hidden="true" />
                                  {t("workflowConfig.aiShot.createKeyframe")}
                                </>
                              )}
                            </Button>
                            {sceneFrame && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                  disabled ||
                                  !selectedStudioSource ||
                                  preparingSceneIndex !== null
                                }
                                onClick={() =>
                                  requestSceneRightsConfirmation(index, (rightsConfirmed) =>
                                    void prepareStudioFrame(index, true, rightsConfirmed)
                                  )
                                }
                              >
                                {t("workflowConfig.aiShot.generateAnother")}
                              </Button>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            {sceneFrame?.approvalStatus === "pending"
                              ? t("workflowConfig.aiShot.approveBeforeVideo")
                              : frameIsCurrentAndApproved
                                ? t("workflowConfig.aiShot.keyframeReadyNote")
                                : t("workflowConfig.aiShot.keyframeReuseNote")}
                          </p>
                          {template?.requiresDetail &&
                            selectedStudioSource &&
                            !hasUsableDetail(selectedStudioSource) && (
                              <p className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs leading-relaxed text-blue-900">
                                {t("workflowConfig.aiShot.detailNote")}
                              </p>
                            )}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                </section>
              )}
              {scene.mode !== "standard" && (
                <>
                  {!sharedBatchSettings && (
                    <div className="flex justify-center py-1" aria-hidden="true">
                      <ArrowDown className="text-primary size-4" strokeWidth={2.25} />
                    </div>
                  )}
                  <SceneVideoResult
                    sceneNumber={index + 1}
                    aspectRatio={outputAspect}
                    clip={sceneVideo}
                    runStarted={Boolean(sceneRunId)}
                    waitingForGeneration={waitingForVideoGeneration}
                    canGenerate={canGenerateScene}
                    canRegenerate={canRegenerateScene}
                    isSubmitting={regeneratingSceneIndex === index}
                    onGenerate={() =>
                      requestSceneRightsConfirmation(index, () =>
                        void openScenePromptPreview(index)
                      )
                    }
                  />
                </>
              )}
              {scene.mode === "standard" &&
                (() => {
                  const editorSource = selectedStartFrame;
                  const baseCrop =
                    scene.standardBaseCrop ?? getStandardBaseCrop(editorSource, outputAspect);
                  const setStandardMotion = (
                    motion: NonNullable<AiVideoSceneOptions["standardMotionPreset"]>
                  ) =>
                    changeScene(index, {
                      standardMotionPreset: motion,
                      standardBaseCrop: motion === "custom" ? baseCrop : null,
                      standardStartCrop: motion === "custom" ? baseCrop : null,
                      standardEndCrop: motion === "custom" ? baseCrop : null,
                      standardStartScale: null,
                      standardEndScale: null,
                      standardStartRotation: null,
                      standardEndRotation: null,
                    });
                  return (
                    <>
                      {!sharedBatchSettings && (
                        <div className="flex justify-center py-1" aria-hidden="true">
                          <ArrowDown className="text-primary size-4" strokeWidth={2.25} />
                        </div>
                      )}
                      <section
                        className="bg-muted/35 space-y-3 rounded-md border p-3"
                        aria-label={t("workflowConfig.aiShot.standardMotionAria", { scene: index + 1 })}
                      >
                        <div>
                          <p className="text-sm font-semibold">{t("workflowConfig.aiShot.sceneVideo")}</p>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {t("workflowConfig.aiShot.sceneVideoDescription")}
                          </p>
                        </div>
                        <div className="grid items-center gap-4 @min-[22rem]:grid-cols-[6.5rem_minmax(0,1fr)] @min-[36rem]:grid-cols-[7.5rem_minmax(0,1fr)]">
                          <StandardMotionPreview
                            scene={scene}
                            sceneNumber={index + 1}
                            baseCrop={baseCrop}
                            source={editorSource}
                            aspectRatio={outputAspect}
                          />
                          <div className="min-w-0 space-y-3">
                            <label className="flex flex-col gap-2 text-xs font-medium">
                              <span>{t("workflowConfig.motion.cameraMovement")}</span>
                              <Select
                                disabled={disabled}
                                value={
                                  scene.standardMotionPreset === "gentle"
                                    ? "zoom"
                                    : (scene.standardMotionPreset ?? "zoom")
                                }
                                onValueChange={(value) => {
                                  const motion = value as NonNullable<
                                    AiVideoSceneOptions["standardMotionPreset"]
                                  >;
                                  setStandardMotion(motion);
                                }}
                              >
                                <SelectTrigger
                                  className="w-full min-w-0"
                                  aria-label={t("workflowConfig.aiShot.standardMovementAria", { scene: index + 1 })}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STANDARD_MOTION_OPTIONS.map(([value, label, labelKey]) => (
                                    <SelectItem key={value} value={value}>
                                      {t(labelKey, { defaultValue: label })}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </label>
                            <StandardMotionEditor
                              scene={scene}
                              sceneNumber={index + 1}
                              baseCrop={baseCrop}
                              source={editorSource}
                              aspectRatio={outputAspect}
                              disabled={disabled}
                              hasRenderedVideo={Boolean(sceneRunId)}
                              onMotionPresetChange={setStandardMotion}
                              onApply={(changes) => changeScene(index, changes)}
                            />
                          </div>
                        </div>
                      </section>
                    </>
                  );
                })()}
              {!hasRequiredSource && (
                <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs leading-relaxed text-amber-900">
                  {template?.requiresLifestyle
                    ? t("workflowConfig.aiShot.noSourceLifestyle")
                    : template?.requiresDetail
                      ? t("workflowConfig.aiShot.noSourceDetail")
                      : t("workflowConfig.aiShot.noSourceDefault")}{" "}
                  {effectiveChosenMockupIds.length > 0 || effectiveArtworkGroupKey
                    ? t("workflowConfig.aiShot.noSourceFilterNote")
                    : ""}
                </p>
              )}
              {/* The seller may reword the scene's template prompt; the product-preservation rules still follow it. */}
              {scene.mode !== "standard" && template && (() => {
                const templatePrompt = subtemplate?.basePrompt ?? template.basePrompt ?? "";
                const customized = scene.customPrompt !== null && scene.customPrompt !== undefined;
                const promptIssue = sceneContentIssue(index, "customPrompt");
                const value = scene.customPrompt ?? templatePrompt;
                return (
                  <details className="group bg-muted/20 rounded-md border p-2" open={customized || Boolean(promptIssue) || undefined}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold">
                      <span className="flex items-center gap-2">
                        {t("workflowConfig.aiShot.customPromptSection")}
                        {customized && (
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {t("workflowConfig.aiShot.customPromptEdited")}
                          </Badge>
                        )}
                      </span>
                      <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <label className="mt-3 block space-y-1.5 text-xs font-medium">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={cn(promptIssue && "text-destructive")}>{t("workflowConfig.aiShot.customPrompt")}</span>
                        <span className="text-muted-foreground shrink-0 text-[11px] font-normal tabular-nums">
                          {value.length}/{MAX_CUSTOM_VIDEO_PROMPT}
                        </span>
                      </span>
                      <textarea
                        disabled={disabled}
                        maxLength={MAX_CUSTOM_VIDEO_PROMPT}
                        value={value}
                        onChange={(event) => {
                          const next = event.currentTarget.value;
                          // Back to the template's own words: nothing is stored, so a newer template version applies.
                          changeScene(index, { customPrompt: next === templatePrompt ? null : next });
                          if (promptIssue) resolveContentIssue(nodeId, `aiScenes.${index}.customPrompt`);
                        }}
                        aria-invalid={promptIssue ? true : undefined}
                        className={cn(
                          "bg-background min-h-40 w-full resize-y rounded-md border p-2.5 font-mono text-xs leading-relaxed font-normal",
                          promptIssue && CONTENT_ISSUE_CLASS
                        )}
                      />
                    </label>
                    {promptIssue && <ContentIssueMessage message={promptIssue} />}
                    <div className="mt-1.5 flex items-start justify-between gap-3">
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {t("workflowConfig.aiShot.customPromptHint", {
                          braces: "{{ }}",
                          example: "{{DURATION}}",
                          interpolation: { escapeValue: false },
                        })}
                      </p>
                      {customized && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto shrink-0 px-0 text-xs"
                          disabled={disabled}
                          onClick={() => changeScene(index, { customPrompt: null })}
                        >
                          {t("workflowConfig.aiShot.customPromptReset")}
                        </Button>
                      )}
                    </div>
                  </details>
                );
              })()}
              {scene.mode !== "standard" && AI_ADVANCED_CONTROLS_ENABLED && (
                <details className="group bg-muted/20 rounded-md border p-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold">
                    {t("workflowConfig.aiShot.advancedSettings")}
                    <ChevronDown
                      className="size-3.5 transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {template &&
                      Object.entries(template.allowedSettings).map(([key, choices]) => {
                        const field = key as TemplateSettingField;
                        return (
                          <label key={key} className="flex flex-col gap-2 text-xs font-medium">
                            <span>{t(`workflowConfig.aiShot.settings.${key}`, { defaultValue: SETTING_LABELS[key] ?? key })}</span>
                            <Select
                              disabled={disabled}
                              value={scene[field]}
                              onValueChange={(value) => changeScene(index, { [field]: value })}
                            >
                              <SelectTrigger
                                aria-label={t("workflowConfig.aiShot.settingAria", { scene: index + 1, setting: t(`workflowConfig.aiShot.settings.${key}`, { defaultValue: SETTING_LABELS[key] ?? key }) })}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {choices.map((choice) => (
                                  <SelectItem key={choice} value={choice}>
                                    {t(`workflowConfig.aiShot.values.${choice}`, { defaultValue: labelFor(choice) })}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </label>
                        );
                      })}
                    <label className="block space-y-1 text-xs font-medium sm:col-span-2">
                      {t("workflowConfig.aiShot.customDirection")}{" "}
                      <span className="text-muted-foreground font-normal">
                        {t("workflowConfig.aiShot.optionalUpTo500")}
                      </span>
                      <textarea
                        disabled={disabled}
                        maxLength={500}
                        value={scene.extraInstructions ?? ""}
                        onChange={(event) =>
                          changeScene(index, { extraInstructions: event.target.value || null })
                        }
                        placeholder="E.g. keep the printed artwork centered and readable; use a slow left-to-right move."
                        className="bg-background min-h-20 w-full rounded-md border p-2 text-sm font-normal"
                      />
                    </label>
                    {template?.basePrompt && (
                      <div className="sm:col-span-2">
                        <details className="text-xs">
                          <summary className="text-muted-foreground cursor-pointer">
                            {t("workflowConfig.aiShot.viewPromptBlocks", { version: template.promptVersion })}
                          </summary>
                          <p className="text-muted-foreground mt-2 font-semibold">
                            {t("workflowConfig.aiShot.templatePrompt")}
                          </p>
                          <p className="bg-muted mt-1 rounded p-2 leading-relaxed">
                            {template.basePrompt}
                          </p>
                          {template.commonPrompt && (
                            <>
                              <p className="text-muted-foreground mt-2 font-semibold">
                                {t("workflowConfig.aiShot.sharedPreservationRules")}
                              </p>
                              <p className="bg-muted mt-1 rounded p-2 leading-relaxed">
                                {template.commonPrompt}
                              </p>
                            </>
                          )}
                        </details>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </article>
          );
        })}
        {cropEditor && scenes[cropEditor.sceneIndex] && (
          <AiStartFrameCropDialog
            asset={cropEditor.asset}
            sceneNumber={cropEditor.sceneIndex + 1}
            aspectRatio={getVideoOutputFormat(outputFormat).aspectRatio}
            initialCrop={scenes[cropEditor.sceneIndex]?.aiStartFrameCrop}
            automaticCrop={scenes[cropEditor.sceneIndex]?.startFrameMode !== "studio" && catalog.find(item => item.code === scenes[cropEditor.sceneIndex]?.templateCode)?.requiresDetail
              ? [cropEditor.asset.regions.detail, cropEditor.asset.regions.artwork].find(region => region && Math.min(region.width * cropEditor.asset.width, region.height * cropEditor.asset.height) >= 512)
              : null}
            onClose={() => setCropEditor(null)}
            onSave={(crop) => { persistScene(cropEditor.sceneIndex, { aiStartFrameCrop: crop }); setCropEditor(null); }}
          />
        )}
        <Dialog
          open={rightsConfirmation !== null}
          onOpenChange={(open) => {
            if (!open) setRightsConfirmation(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("workflowConfig.aiShot.confirmRightsTitle")}</DialogTitle>
              <DialogDescription>
                {t("workflowConfig.aiShot.confirmRightsDescription")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRightsConfirmation(null)}
              >
                {t("workflowConfig.aiShot.cancel")}
              </Button>
              <Button type="button" onClick={confirmSceneRights}>
                {t("workflowConfig.aiShot.haveRights")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {scenes.length === 0 ? (
          <div className="bg-muted/30 flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-7 text-center">
            <span className="bg-background text-muted-foreground grid size-10 place-items-center rounded-full border shadow-xs">
              <Clapperboard aria-hidden="true" className="size-5" strokeWidth={1.75} />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold">{t("workflowConfig.aiShot.noScenesTitle")}</p>
              <p className="text-muted-foreground mx-auto max-w-xs text-xs leading-relaxed">
                {t("workflowConfig.aiShot.noScenesDescription")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={addScene}
              className="h-9 gap-1.5 px-3.5 text-[13px] font-semibold hover:translate-y-0"
            >
              <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
              <span>{t("workflowConfig.aiShot.addFirstScene")}</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-2 py-1">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="bg-border/70 h-px flex-1" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || scenes.length >= 4 || totalSeconds + 1 > MAX_VIDEO_DURATION_SECONDS}
                onClick={addScene}
                className="text-primary hover:bg-primary/5 h-10 gap-1.5 rounded-md px-3 text-[13px] font-semibold shadow-none transition-colors hover:translate-y-0 focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
                <span>{t("workflowConfig.aiShot.addScene")}</span>
              </Button>
              <span aria-hidden="true" className="bg-border/70 h-px flex-1" />
            </div>
            {hasAiScenes && (
              <p className="text-muted-foreground text-center text-xs">
                {t("workflowConfig.aiShot.estimatedFootage", { cost: aiSceneCost.toFixed(2) })}
              </p>
            )}
          </div>
        )}
        <section aria-label={t("workflowConfig.aiShot.fullVideoEditing")} className="space-y-2 pt-1">
          <p className="text-sm font-semibold">{t("workflowConfig.aiShot.fullVideo")}</p>
          <VideoTimelineEditor
            disabled={disabled || isApplyingEdit}
            config={node.data.config as GenerateVideoConfig}
            assets={allAssets}
            sceneVideos={previewSceneVideos}
            onSave={(next) => {
              useWorkflowStore.getState().updateNodeConfig(nodeId, next);
              onChange(next.aiScenes ?? [], next.durationSeconds, next.aiGlobalInstructions ?? null);
              // The joined video already waits at Review Video: the edit goes to it too, or approving it would
              // render and export the video as it was before the edit.
              if (canApplyEdit)
                void applyEdit(next).then((applied) => {
                  if (applied) showToast("success", t("workflowMedia.videoReview.editApplied"));
                });
            }}
          />
        </section>
        <details className="group text-muted-foreground text-xs">
          <summary className="hover:text-foreground flex min-h-9 cursor-pointer list-none items-center gap-1.5 font-medium transition-colors">
            <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180" />
            {t("workflowConfig.aiShot.aboutEstimates")}
          </summary>
          <p className="pb-1 leading-relaxed">
            {t("workflowConfig.aiShot.aboutEstimatesBody")}
          </p>
        </details>
        <Dialog
          open={previewFrame !== null}
          onOpenChange={(open) => {
            if (!open) setPreviewFrame(null);
          }}
        >
          <DialogContent
            showCloseButton={false}
            className="h-[90dvh] w-[calc(100%-2rem)] max-w-4xl border-0 bg-transparent p-0 shadow-none [--dialog-phone-height:100dvh]"
          >
            <button
              type="button"
              aria-label={t("workflowConfig.aiShot.closeImagePreview")}
              onClick={() => setPreviewFrame(null)}
              data-taste-skill-ignore="dialog overlay shadow"
              className="absolute -top-9 right-0 z-10 inline-flex size-8 items-center justify-center text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <X aria-hidden="true" className="size-6" />
            </button>
            <DialogHeader className="sr-only">
              <DialogTitle>{t("workflowConfig.aiShot.imagePreview")}</DialogTitle>
              <DialogDescription>
                {previewFrame
                  ? t("workflowConfig.aiShot.selectedStartFrameForScene", { scene: previewFrame.scene })
                  : t("workflowConfig.aiShot.selectedStartFramePreview")}
              </DialogDescription>
            </DialogHeader>
            {previewFrame && (
              <div className="relative mx-auto h-full w-full">
                <Image
                  src={previewFrame.url}
                  alt={t("workflowConfig.aiShot.startFrameImageAlt", { scene: previewFrame.scene })}
                  fill
                  sizes="90vw"
                  unoptimized
                  className="object-contain"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </section>
    </>
  );
}
