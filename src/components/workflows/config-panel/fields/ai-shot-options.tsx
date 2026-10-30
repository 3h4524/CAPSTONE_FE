"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  Check,
  ChevronDown,
  Copy,
  GripVertical,
  Minus,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { generateAiStudioFrame, quoteAiStudioFrame, videoWorkflowKeys } from "@/api/video-workflow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { SceneVideoResult } from "@/components/workflows/config-panel/fields/scene-video-result";
import {
  getStandardBaseCrop,
  STANDARD_MOTION_OPTIONS,
  StandardMotionEditor,
  StandardMotionPreview,
} from "@/components/workflows/config-panel/fields/standard-motion-editor";
import { VideoTimelineEditor } from "@/components/workflows/media/video-timeline-editor";
import { confirmAiShot } from "@/helpers/confirm-ai-shot";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { getVideoOutputFormat } from "@/helpers/video-output-formats";
import { readString, readStringArray } from "@/helpers/workflow-config";
import { useReviewMockupAsset } from "@/hooks/mutations/use-review-mockup-asset";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useAiVideoTemplates } from "@/hooks/queries/use-ai-video-templates";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useRunSceneVideos } from "@/hooks/queries/use-run-scene-videos";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowSave } from "@/hooks/use-workflow-save";
import { generateVideoConfigSchema } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import type {
  AiSceneVideo,
  AiVideoSceneOptions,
  AiVideoTemplateDefinition,
  GenerateVideoConfig,
  MockupAsset,
  Region,
} from "@/types/video-workflow";

type LegacyOptions = NonNullable<GenerateVideoConfig["aiShotOptions"]>;
const AI_ADVANCED_CONTROLS_ENABLED = false;
const BASE_SCENE: AiVideoSceneOptions = {
  mode: "standard",
  mockupId: null,
  templateCode: "cinematic_product_showcase",
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
          ? "creator_pov_ugc"
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

function normalizeTemplateSettings(
  scene: AiVideoSceneOptions,
  template: AiVideoTemplateDefinition
): AiVideoSceneOptions {
  if (!AI_ADVANCED_CONTROLS_ENABLED) {
    return {
      ...scene,
      framing: template.defaults.framing,
      cameraAngle: template.defaults.cameraAngle,
      cameraMovement: template.defaults.cameraMovement,
      subjectMotion: template.defaults.subjectMotion,
      motionIntensity: template.defaults.motionIntensity,
      lighting: template.defaults.lighting,
      extraInstructions: null,
      mode: "ai",
    };
  }
  let normalized: AiVideoSceneOptions = { ...scene, mode: "ai" };
  for (const field of TEMPLATE_SETTING_FIELDS) {
    const choices = template.allowedSettings[field] ?? [];
    if (choices.length === 0 || choices.includes(normalized[field])) continue;
    const defaultValue = template.defaults[field];
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

function MockupOption({ asset }: { asset: MockupAsset }) {
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
          {asset.role} | {asset.width}x{asset.height} | {asset.variantKey || asset.id.slice(0, 6)}
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
            alt={`Reference image ${index + 1}: ${file.name}`}
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
          aria-label={`Remove reference image ${index + 1}`}
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
}: {
  nodeId: string;
  disabled: boolean;
  onChange: (
    scenes: AiVideoSceneOptions[],
    seconds: number,
    sharedInstructions?: string | null
  ) => void;
}) {
  const dragIndex = useRef<number | null>(null);
  const referenceFileInput = useRef<HTMLInputElement | null>(null);
  const referenceUploadSceneIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedForMove, setSelectedForMove] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [preparingSceneIndex, setPreparingSceneIndex] = useState<number | null>(null);
  const [regeneratingSceneIndex, setRegeneratingSceneIndex] = useState<number | null>(null);
  const [previewFrame, setPreviewFrame] = useState<{ url: string; scene: number } | null>(null);
  const [framePicker, setFramePicker] = useState<{
    sceneIndex: number;
    view: "library" | "create";
  } | null>(null);
  const [referenceFilesByScene, setReferenceFilesByScene] = useState<Record<number, File[]>>({});
  const node = useWorkflowStore((state) => state.nodes.find((item) => item.id === nodeId));
  const productId = useWorkflowStore((state) =>
    readString(
      state.nodes.find((item) => item.data.type === "product-input")?.data.config.productId
    )
  );
  const applyMockupNode = useWorkflowStore((state) =>
    state.nodes.find((item) => item.data.type === "apply-mockup")
  );
  const { data: catalog = [], isPending, isError, refetch } = useAiVideoTemplates();
  const { data: allAssets = [], isPending: areAssetsLoading } = useMockupAssets(productId);
  const queryClient = useAppQueryClient();
  const { mutate: reviewStudioFrame, isPending: isReviewingStudioFrame } = useReviewMockupAsset();
  const { run } = useWorkflowRuntime();
  const { saveWorkflow } = useWorkflowSave();
  const sceneRunId = run?.id ?? null;
  const { data: sceneVideos = [] } = useRunSceneVideos(sceneRunId);
  const { mutateAsync: actOnRun } = useWorkflowRunAction();
  const chosenMockupIds = readStringArray(applyMockupNode?.data.config.mockupIds);
  const artworkGroupKey = readString(applyMockupNode?.data.config.artworkGroupKey);
  const rawScenes =
    (node?.data.config.aiScenes as AiVideoSceneOptions[] | undefined) ?? EMPTY_SCENES;
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
  const legacyStudioMode = node?.data.config.aiStudioMode === "studio";
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
  const scenes: AiVideoSceneOptions[] = rawScenes.map((scene) => {
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
        30,
        Math.max(1, Number(node.data.config.durationSeconds ?? 1))
      );
      const targetCount = ids.length
        ? Math.min(4, Math.max(ids.length, Math.ceil(targetDuration / 8)))
        : 1;
      const durationTarget = ids.length ? targetDuration : 1;
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
        if (durations[index]! >= 30) break;
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
              ? "creator_pov_ugc"
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
    if (!node || rawScenes.length === 0 || areAssetsLoading || !productId) return;
    const normalizedScenes: AiVideoSceneOptions[] = rawScenes.map((scene) => {
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
    const needsNormalization =
      node.data.config.mode !== normalizedMode ||
      rawScenes.some(
        (scene, index) =>
          scene.mode !== normalizedScenes[index]?.mode ||
          (scene.mode !== "standard" &&
            TEMPLATE_SETTING_FIELDS.some(
              (field) => scene[field] !== normalizedScenes[index]?.[field]
            )) ||
          (scene.templateCode === "cinematic_product_showcase" && scene.startFrameMode == null) ||
          (scene.templateCode === "cinematic_product_showcase" &&
            scene.studioLayout !== normalizedScenes[index]?.studioLayout) ||
          scene.mockupId !== normalizedScenes[index]?.mockupId ||
          scene.extraInstructions !== normalizedScenes[index]?.extraInstructions ||
          (scene.studioReferenceHashes ?? []).join("|") !==
            (normalizedScenes[index]?.studioReferenceHashes ?? []).join("|")
      ) || node.data.config.aiGlobalInstructions !== sharedInstructions;
    if (!needsNormalization) return;
    const seconds = normalizedScenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
    useWorkflowStore.getState().updateNodeConfig(nodeId, {
      ...node.data.config,
      mode: normalizedMode,
      aiScenes: normalizedScenes,
      aiGlobalInstructions: sharedInstructions,
      durationSeconds: seconds,
    });
    onChange(normalizedScenes, seconds, sharedInstructions);
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
    useWorkflowStore.getState().updateNodeConfig(nodeId, {
      ...cleanConfig,
      mode: workflowModeForScenes(next),
      aiScenes: next,
      aiGlobalInstructions: effectiveSharedInstructions,
      durationSeconds: seconds,
    });
    onChange(next, seconds, effectiveSharedInstructions);
  };
  const regenerateScene = async (sceneOrder: number) => {
    if (!run || !node) return;
    const parsed = generateVideoConfigSchema.safeParse(node.data.config);
    if (!parsed.success) {
      showToast("warning", parsed.error.issues[0]?.message ?? "Check AI scene settings.");
      return;
    }
    setRegeneratingSceneIndex(sceneOrder);
    try {
      const token = await confirmAiShot(run.id, parsed.data, true, sceneOrder);
      if (token === null) return;
      queryClient.setQueryData<AiSceneVideo[]>(videoWorkflowKeys.sceneVideos(run.id), (current) =>
        current?.map((clip) =>
          clip.sceneOrder === sceneOrder
            ? { ...clip, status: "pending", previewUrl: null, failure: null }
            : clip
        )
      );
      await actOnRun({
        runId: run.id,
        expectedRevision: run.revision,
        action: "regenerate_ai_shot",
        config: parsed.data,
        aiShotQuoteToken: token,
        sceneOrder,
      });
      showToast("success", `Scene ${sceneOrder + 1} is being regenerated.`);
    } catch (error) {
      void queryClient.invalidateQueries({ queryKey: videoWorkflowKeys.sceneVideos(run.id) });
      showToast("error", getErrorMessage(error));
    } finally {
      setRegeneratingSceneIndex(null);
    }
  };
  const prepareStudioFrame = async (sceneIndex: number, regenerate = false) => {
    const scene = scenes[sceneIndex];
    const sources = originalApproved;
    const source = scene?.mockupId
      ? sources.find((asset) => asset.id === scene.mockupId)
      : undefined;
    if (!scene || !source || !productId) return;
    const layout = normalizeStudioLayout(scene.studioLayout);
    setPreparingSceneIndex(sceneIndex);
    const customPrompt = scene.studioPrompt?.trim() || null;
    const references = referenceFilesByScene[sceneIndex] ?? [];
    const request = {
      productId,
      sourceMockupId: source.id,
      layout,
      outputFormat,
      customPrompt,
      templateCode: scene.templateCode,
      references,
      referenceRightsConfirmed: scene.rightsConfirmed,
      regenerate,
    };
    try {
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
            ? "Matching approved keyframe selected. No new image was generated."
            : "Matching keyframe found. Review and approve it before using it in video."
        );
        return;
      }
      const estimate = quote.estimatedCostUsd.toFixed(2);
      const confirmed = window.confirm(
        `Generate one custom prompt keyframe with Gemini Image? Estimated image cost: $${estimate} USD. This is charged separately from MiniMax H3 video generation.`
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
        `Keyframe created. Review and approve it before generating video; estimated image cost: $${result.estimatedCostUsd.toFixed(2)} USD.`
      );
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setPreparingSceneIndex(null);
    }
  };
  const changeScene = (index: number, changes: Partial<AiVideoSceneOptions>) =>
    update(
      scenes.map((scene, position) => (position === index ? { ...scene, ...changes } : scene))
    );
  const persistScene = (index: number, changes: Partial<AiVideoSceneOptions>) => {
    changeScene(index, changes);
    queueMicrotask(() => saveWorkflow());
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
      references.length >= 3 ||
      file.size > 20 * 1024 * 1024 ||
      references.reduce((sum, item) => sum + item.size, file.size) > 20 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      showToast(
        "error",
        "Choose JPEG, PNG or WebP references totaling 20 MB or less, up to 3 images."
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
    setAnnouncement(`Scene moved to position ${nextIndex + 1} of ${scenes.length}.`);
  };
  const totalSeconds = scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
  const aiSceneSeconds = scenes.reduce(
    (sum, scene) => sum + (scene.mode === "ai" ? scene.durationSeconds : 0),
    0
  );
  const hasAiScenes = aiSceneSeconds > 0;
  const copyScene = (index: number) => {
    const scene = scenes[index];
    if (!scene || scenes.length >= 4 || totalSeconds + scene.durationSeconds > 30) return;
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
      scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0) + 1 > 30
    )
      return;
    const definition = catalog.find((item) => item.code === "cinematic_product_showcase");
    const nextScene: AiVideoSceneOptions = {
      ...BASE_SCENE,
      ...(definition?.defaults ?? {}),
      mode: "standard",
      durationSeconds: 1,
      mockupId: null,
      extraInstructions: null,
      rightsConfirmed: false,
    };
    update([...scenes, nextScene]);
  };

  return (
    <section className="bg-muted/20 space-y-3 rounded-lg border p-3" aria-label="Scene setup">
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
      <div className="space-y-2">
        <div>
          <p className="text-sm font-semibold">Scenes</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Set each scene separately. Drag the grip, or select a grip then a destination scene to
            reorder.
          </p>
        </div>
        <div
          className="bg-background grid grid-cols-[auto_minmax(3rem,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2"
          aria-label={`Total video duration: ${totalSeconds} of 30 seconds`}
        >
          <p className="text-foreground text-sm font-semibold whitespace-nowrap tabular-nums">
            Total duration {totalSeconds}s / 30s
          </p>
          <div
            role="progressbar"
            aria-label="Total video duration"
            aria-valuemin={0}
            aria-valuemax={30}
            aria-valuenow={Math.min(totalSeconds, 30)}
            aria-valuetext={`${totalSeconds} of 30 seconds`}
            className="bg-muted h-2 min-w-0 overflow-hidden rounded-full"
          >
            <div
              className="h-full rounded-full bg-teal-600 transition-[width] duration-200"
              style={{ width: `${Math.min((totalSeconds / 30) * 100, 100)}%` }}
            />
          </div>
          <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
            {scenes.length} {scenes.length === 1 ? "scene" : "scenes"}
          </span>
        </div>
      </div>
      {hasAiScenes && AI_ADVANCED_CONTROLS_ENABLED && (
        <label className="block space-y-1 text-xs font-medium">
          Shared direction for AI scenes{" "}
          <span className="text-muted-foreground font-normal">
            (optional, up to 500 characters)
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
            {sharedInstructions?.length ?? 0}/500 | appended before product-preservation guardrails
          </span>
        </label>
      )}
      {hasAiScenes && !AI_ADVANCED_CONTROLS_ENABLED && (
        <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-900">
          Advanced AI controls are temporarily disabled. Each AI scene uses the selected
          template&apos;s default camera, motion, lighting, and prompt direction while prompt
          templates are being tested.
        </p>
      )}
      {hasAiScenes && isPending && (
        <p className="text-muted-foreground text-xs">Loading AI scene templates... </p>
      )}
      {hasAiScenes && isError && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          <span>Could not load the AI template catalog. Your scene settings are preserved.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
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
        const sources = scene.startFrameMode === "studio" ? originalApproved : approved;
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
        const needsRightsConfirmation = Boolean(template?.requiresLifestyle);
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
        const selectedStartFrame = selectedSourceFrame ?? selectedSource;
        const otherDuration = totalSeconds - scene.durationSeconds;
        const maxDuration =
          scene.mode === "standard"
            ? Math.max(1, 30 - otherDuration)
            : ([8, 6, 4].find((seconds) => otherDuration + seconds <= 30) ?? scene.durationSeconds);
        const canDuplicate = scenes.length < 4 && totalSeconds + scene.durationSeconds <= 30;
        const sceneVideo = sceneVideos.find((clip) => clip.sceneOrder === index);
        const generateRunNode = run?.nodes.find((item) => item.nodeType === "generate-video");
        const waitingForVideoGeneration = Boolean(
          sceneRunId &&
            !sceneVideo &&
            generateRunNode &&
            ["pending", "running"].includes(generateRunNode.status)
        );
        const canRegenerateScene = Boolean(
          run &&
            ["waiting_for_review", "waiting_for_input", "failed"].includes(run.status) &&
            sceneVideo &&
            ["stored", "failed"].includes(sceneVideo.status) &&
            regeneratingSceneIndex === null
        );
        const frameStatusLabel =
          preparingSceneIndex === index
            ? "Generating"
            : sceneFrame?.approvalStatus === "pending"
              ? "Pending approval"
              : frameIsCurrentAndApproved
                ? "Ready"
                : sceneFrame?.approvalStatus === "approved"
                  ? "Needs update"
                  : "Rejected";
        const frameStatusClass =
          preparingSceneIndex === index
            ? "bg-muted text-muted-foreground"
            : sceneFrame?.approvalStatus === "pending"
              ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
              : frameIsCurrentAndApproved
                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200"
                : "bg-destructive/10 text-destructive";
        const selectSceneKeyframe = () => {
          if (!keyframeToUse) return;
          const metadata = studioMetadata(keyframeToUse);
          persistScene(index, {
            startFrameMode: "studio",
            mockupId: metadata?.sourceMockupId ?? selectedStudioSource?.id ?? scene.mockupId,
            studioLayout:
              (metadata?.layout as "hanging_window" | "flat_lay" | "none" | undefined) ??
              studioLayout,
            studioFrameId: keyframeToUse.id,
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
              ? "Keyframe selected for this scene. Approve it before generating video."
              : "Keyframe selected for this scene."
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
            <header className="flex items-center gap-2">
              <h3 className="bg-background flex size-7 items-center justify-center rounded-md border text-sm font-semibold tabular-nums">
                <span className="sr-only">Scene </span>
                {index + 1}
              </h3>
              <Select
                disabled={disabled}
                value={scene.mode ?? "standard"}
                onValueChange={(value) => {
                  if (value === "standard") {
                    changeScene(index, {
                      mode: "standard",
                      durationSeconds: Math.min(scene.durationSeconds, 30 - otherDuration),
                      standardMotionPreset:
                        scene.standardMotionPreset === "gentle"
                          ? "zoom"
                          : (scene.standardMotionPreset ?? "zoom"),
                    });
                    return;
                  }
                  const maxAiDuration = [8, 6, 4].find((seconds) => otherDuration + seconds <= 30);
                  if (maxAiDuration === undefined) return;
                  const aiDuration =
                    [4, 6, 8].find(
                      (seconds) => seconds >= scene.durationSeconds && seconds <= maxAiDuration
                    ) ?? maxAiDuration;
                  changeScene(index, { mode: "ai", durationSeconds: aiDuration });
                }}
              >
                <SelectTrigger
                  className="h-8 w-28 shrink-0"
                  aria-label={`Scene ${index + 1} generation mode`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="ai" disabled={otherDuration + 4 > 30}>
                    AI video
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex max-w-56 min-w-0 flex-1 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Decrease scene ${index + 1} duration`}
                  disabled={
                    disabled || scene.durationSeconds <= (scene.mode === "standard" ? 1 : 4)
                  }
                  onClick={() =>
                    changeScene(index, {
                      durationSeconds: Math.max(
                        scene.mode === "standard" ? 1 : 4,
                        scene.durationSeconds - (scene.mode === "standard" ? 1 : 2)
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
                  step={scene.mode === "standard" ? 1 : 2}
                  value={scene.durationSeconds}
                  disabled={disabled}
                  aria-label={`Scene ${index + 1} duration`}
                  onChange={(event) =>
                    changeScene(index, { durationSeconds: Number(event.target.value) })
                  }
                  className="accent-primary h-2 min-w-0 flex-1 cursor-pointer disabled:cursor-not-allowed"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Increase scene ${index + 1} duration`}
                  disabled={disabled || scene.durationSeconds >= maxDuration}
                  onClick={() =>
                    changeScene(index, {
                      durationSeconds: Math.min(
                        maxDuration,
                        scene.durationSeconds + (scene.mode === "standard" ? 1 : 2)
                      ),
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
                  aria-label={`Drag scene ${index + 1}; use arrow keys to reorder`}
                  title="Reorder with arrow keys when focused"
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
                        `Scene ${index + 1} selected. Select another scene to move it.`
                      );
                    } else if (selectedForMove === index) {
                      setSelectedForMove(null);
                      setAnnouncement("Scene move cancelled.");
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
                  aria-label={`Copy scene ${index + 1}`}
                  title="Copy scene"
                  disabled={disabled || !canDuplicate}
                  onClick={() => copyScene(index)}
                >
                  <Copy aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove scene ${index + 1}`}
                  disabled={disabled || scenes.length <= 1}
                  onClick={() => removeScene(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </header>
            {scene.mode !== "standard" && (
              <label className="flex flex-col gap-2 text-xs font-medium">
                <span>AI template</span>
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
                      extraInstructions: null,
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
                  <SelectTrigger aria-label={`Scene ${index + 1} AI template`}>
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
            <section
              className="space-y-3 rounded-md border p-3"
              aria-label={`Scene ${index + 1} start frame`}
            >
              <div>
                <p className="text-sm font-semibold">Start frame</p>
                <p className="text-muted-foreground mt-1 max-w-md text-xs leading-relaxed">
                  Choose the image this scene starts from, or create a custom keyframe.
                </p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setFramePicker({ sceneIndex: index, view: "library" })}
                aria-label={`${selectedStartFrame ? "Change" : "Choose"} start frame for scene ${index + 1}`}
                className="bg-background hover:bg-muted/40 focus-visible:ring-ring group flex min-h-24 w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selectedStartFrame ? (
                  <span className="bg-muted relative h-20 w-16 shrink-0 overflow-hidden rounded-md border">
                    <Image
                      src={selectedStartFrame.previewUrl}
                      alt=""
                      fill
                      sizes="64px"
                      unoptimized
                      className="object-contain"
                    />
                  </span>
                ) : (
                  <span className="bg-muted text-muted-foreground flex h-20 w-16 shrink-0 items-center justify-center rounded-md border border-dashed">
                    <Plus aria-hidden="true" className="size-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {selectedStartFrame ? "Selected start frame" : "Choose a start frame"}
                  </span>
                  <span className="text-muted-foreground mt-1 block truncate text-xs">
                    {selectedSourceFrame
                      ? `Approved keyframe · revision ${selectedSourceFrame.revision}`
                      : selectedSource
                        ? `${selectedSource.role} · ${selectedSource.width} × ${selectedSource.height}${selectedSource.variantKey ? ` · ${selectedSource.variantKey}` : ""}`
                        : "Browse approved images or create a new keyframe"}
                  </span>
                </span>
                <span className="text-primary shrink-0 px-1 text-xs font-semibold">
                  {selectedStartFrame ? "Change" : "Choose"}
                </span>
              </button>

              <Dialog
                open={framePicker?.sceneIndex === index}
                onOpenChange={(open) => {
                  if (!open) setFramePicker(null);
                }}
              >
                <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0">
                  <DialogHeader className="border-b px-5 pt-5 pb-4 text-left">
                    <DialogTitle>Choose start frame</DialogTitle>
                    <DialogDescription>
                      Select an approved image for scene {index + 1}, or create a custom keyframe.
                    </DialogDescription>
                  </DialogHeader>
                  <div
                    className="border-b px-5 pt-3"
                    role="tablist"
                    aria-label="Start frame options"
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
                        Approved frames
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
                        Create new keyframe
                      </button>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    {framePicker?.view === "library" ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-semibold">Approved frames</p>
                          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                            Select a frame to use immediately. The selected item is saved when you
                            click it.
                          </p>
                        </div>
                        {approved.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {approved.map((asset) => {
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
                                  aria-label={`Use ${isGeneratedFrame ? "approved keyframe" : asset.role} ${asset.variantKey || asset.id.slice(0, 6)} for scene ${index + 1}`}
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
                                      title={isGeneratedFrame ? "Approved keyframe" : asset.role}
                                    >
                                      {isGeneratedFrame ? "Approved keyframe" : asset.role}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-muted/30 flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
                            <p className="text-sm font-semibold">No approved frames yet</p>
                            <p className="text-muted-foreground mt-1 max-w-sm text-xs leading-relaxed">
                              Approve a product image first, or create a custom keyframe from an
                              approved source.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedStudioSource?.role === "Lifestyle" && (
                          <p className="text-muted-foreground text-xs">
                            The approved people and setting stay in the image.
                          </p>
                        )}
                        <label className="flex flex-col gap-2 text-xs font-medium">
                          <span>
                            Approved product image{" "}
                            <span className="text-muted-foreground font-normal">(required)</span>
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
                              aria-label={`Scene ${index + 1} mockup source for new keyframe`}
                              aria-required="true"
                            >
                              <SelectValue placeholder="Select an image" />
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
                            <span>
                              Custom keyframe prompt{" "}
                              <span className="text-muted-foreground font-normal">(optional)</span>
                            </span>
                            <span className="text-muted-foreground shrink-0 text-[11px] font-normal tabular-nums">
                              {scene.studioPrompt?.length ?? 0}/500
                            </span>
                          </span>
                          <textarea
                            disabled={disabled}
                            maxLength={500}
                            value={scene.studioPrompt ?? ""}
                            onChange={(event) =>
                              changeScene(index, {
                                studioPrompt: event.currentTarget.value || null,
                                studioFrameId: null,
                              })
                            }
                            placeholder="Describe how the product should appear and how the reference images should guide the scene."
                            className="bg-background min-h-24 w-full resize-y rounded-md border p-2.5 text-sm leading-relaxed font-normal"
                          />
                        </label>
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium">
                            Reference images{" "}
                            <span className="text-muted-foreground font-normal tabular-nums">
                              ({sceneReferenceFiles.length}/3, optional)
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
                            {sceneReferenceFiles.length < 3 && (
                              <Button
                                type="button"
                                variant="outline"
                                disabled={disabled}
                                onClick={() => chooseReferenceFile(index)}
                                aria-label={`Add reference image ${sceneReferenceFiles.length + 1} of 3`}
                                className="text-muted-foreground hover:text-foreground flex size-20 shrink-0 flex-col gap-1 rounded-md border-dashed p-2"
                              >
                                <Plus aria-hidden="true" className="size-5" />
                                <span className="text-[11px] font-medium">Add image</span>
                              </Button>
                            )}
                          </div>
                        </div>
                        {needsRightsConfirmation && (
                          <label className="bg-muted/30 flex min-h-11 items-start gap-3 rounded-md border p-3 text-xs leading-5">
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={scene.rightsConfirmed}
                              onChange={(event) =>
                                changeScene(index, {
                                  rightsConfirmed: event.target.checked,
                                  studioFrameId: null,
                                })
                              }
                              className="mt-1"
                            />
                            <span>
                              I have the rights to use people visible in the selected product and
                              reference images.
                            </span>
                          </label>
                        )}
                        {(sceneFrame || preparingSceneIndex === index) && (
                          <section
                            className="bg-muted/40 space-y-3 rounded-md p-3"
                            aria-label={`Scene ${index + 1} keyframe result`}
                            aria-live="polite"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold">Keyframe preview</p>
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${frameStatusClass}`}
                              >
                                {frameStatusLabel}
                                {sceneFrame && preparingSceneIndex !== index
                                  ? ` · r${sceneFrame.revision}`
                                  : ""}
                              </span>
                            </div>
                            <div className="grid min-w-0 gap-3 min-[420px]:grid-cols-[7rem_minmax(0,1fr)]">
                              {preparingSceneIndex === index ? (
                                <div
                                  role="status"
                                  aria-label="Generating keyframe preview"
                                  className="bg-muted aspect-[9/16] w-28 animate-pulse rounded-md"
                                >
                                  <span className="sr-only">Generating keyframe...</span>
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
                                    aria-label={`View keyframe for scene ${index + 1}`}
                                    title="View keyframe"
                                    className="bg-background focus-visible:ring-ring relative aspect-[9/16] w-28 cursor-zoom-in overflow-hidden rounded-md focus-visible:ring-2 focus-visible:ring-offset-2"
                                  >
                                    <Image
                                      src={sceneFrame.previewUrl}
                                      alt={`Scene ${index + 1} studio keyframe preview`}
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
                                    <p className="font-medium">Creating your keyframe</p>
                                    <p className="text-muted-foreground mt-1 leading-relaxed">
                                      This may take a moment. The preview will appear here when it
                                      is ready.
                                    </p>
                                  </>
                                ) : (
                                  sceneFrame && (
                                    <>
                                      <p className="font-medium">Generated keyframe</p>
                                      <p className="text-muted-foreground mt-1 leading-relaxed">
                                        {sceneFrame.approvalStatus === "pending"
                                          ? "Review and approve this image before generating video."
                                          : frameIsCurrentAndApproved
                                            ? "Approved and ready to use for this scene."
                                            : sceneFrame.approvalStatus === "approved"
                                              ? "The source or direction has changed. Generate another matching keyframe."
                                              : "This keyframe was rejected. Generate another to continue."}
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
                                            Approve
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
                                            Reject
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
                              (hasSceneKeyframe && !keyframeCanBeUsed) ||
                              (needsRightsConfirmation && !scene.rightsConfirmed)
                            }
                            onClick={() => {
                              if (hasSceneKeyframe) {
                                selectSceneKeyframe();
                                setFramePicker(null);
                                return;
                              }
                              void prepareStudioFrame(index);
                            }}
                            className="min-h-9 gap-2 px-4 font-semibold"
                          >
                            {preparingSceneIndex === index ? (
                              <>
                                <span
                                  className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
                                  aria-hidden="true"
                                />
                                Generating keyframe...
                              </>
                            ) : hasSceneKeyframe ? (
                              <>
                                <Check aria-hidden="true" />
                                Use keyframe for this scene
                              </>
                            ) : (
                              <>
                                <Sparkles aria-hidden="true" />
                                Create keyframe
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
                                preparingSceneIndex !== null ||
                                (needsRightsConfirmation && !scene.rightsConfirmed)
                              }
                              onClick={() => void prepareStudioFrame(index, true)}
                            >
                              Generate another
                            </Button>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {sceneFrame?.approvalStatus === "pending"
                            ? "Approve the generated image before creating the video."
                            : frameIsCurrentAndApproved
                              ? "This approved keyframe is ready for the current scene."
                              : "Matching approved keyframes are reused without a new image generation call."}
                        </p>
                        {template?.requiresDetail &&
                          selectedStudioSource &&
                          !hasUsableDetail(selectedStudioSource) && (
                            <p className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs leading-relaxed text-blue-900">
                              This image can be used directly. Mark an artwork/detail region for a
                              tighter automatic crop, or create an approved close-up keyframe for
                              the clearest detail. Review generated keyframes because fine print may
                              be reinterpreted.
                            </p>
                          )}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </section>
            {scene.mode !== "standard" && (
              <>
                <div className="flex justify-center py-1" aria-hidden="true">
                  <ArrowDown className="text-primary size-4" strokeWidth={2.25} />
                </div>
                <SceneVideoResult
                  sceneNumber={index + 1}
                  clip={sceneVideo}
                  runStarted={Boolean(sceneRunId)}
                  waitingForGeneration={waitingForVideoGeneration}
                  canRegenerate={canRegenerateScene}
                  isRegenerating={regeneratingSceneIndex === index}
                  onRegenerate={() => void regenerateScene(index)}
                />
              </>
            )}
            {scene.mode === "standard" &&
              (() => {
                const editorSource = selectedSourceFrame ?? selectedSource;
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
                    <div className="flex justify-center py-1" aria-hidden="true">
                      <ArrowDown className="text-primary size-4" strokeWidth={2.25} />
                    </div>
                    <section
                      className="bg-muted/35 space-y-3 rounded-md border p-3"
                      aria-label={`Scene ${index + 1} Standard camera motion`}
                    >
                      <div>
                        <p className="text-sm font-semibold">Scene video</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Preview this scene with the selected camera movement.
                        </p>
                      </div>
                      <div className="grid items-start gap-4 min-[440px]:grid-cols-[10rem_minmax(0,1fr)]">
                        <StandardMotionPreview
                          scene={scene}
                          sceneNumber={index + 1}
                          baseCrop={baseCrop}
                          source={editorSource}
                          aspectRatio={outputAspect}
                        />
                        <div className="min-w-0 space-y-4">
                          <label className="flex flex-col gap-2 text-xs font-medium">
                            <span>Camera movement</span>
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
                                aria-label={`Scene ${index + 1} Standard camera movement`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STANDARD_MOTION_OPTIONS.map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </label>
                          <div className="bg-background/70 space-y-2 rounded-lg border p-3">
                            <div>
                              <p className="text-xs font-semibold">Fine-tune the motion</p>
                              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                Adjust the first and last frame when the preset needs a more precise crop.
                              </p>
                            </div>
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
                      </div>
                    </section>
                  </>
                );
              })()}
            {!hasRequiredSource && (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs leading-relaxed text-amber-900">
                {template?.requiresLifestyle
                  ? "Choose an approved product image. You may attach optional approved reference images and describe their use in the keyframe direction."
                  : template?.requiresDetail
                    ? "Choose any approved mockup or keyframe. Marking an artwork/detail region is optional; without one, the scene uses the full selected image, so a close-up keyframe gives the clearest detail."
                    : "Approve at least one product image before generating this scene."}{" "}
                {effectiveChosenMockupIds.length > 0 || effectiveArtworkGroupKey
                  ? "Also check that the image is included in Apply Mockup's allowed images and selected artwork group."
                  : ""}
              </p>
            )}
            {needsRightsConfirmation && (
              <label className="flex items-start gap-2 text-xs leading-5">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={scene.rightsConfirmed}
                  onChange={(event) =>
                    changeScene(index, {
                      rightsConfirmed: event.target.checked,
                      studioFrameId: null,
                    })
                  }
                  className="mt-1"
                />
                <span>
                  I have the rights to use people visible in the selected product and reference
                  images.
                </span>
              </label>
            )}
            {scene.mode !== "standard" && AI_ADVANCED_CONTROLS_ENABLED && (
              <details className="group bg-muted/20 rounded-md border p-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold">
                  Advanced camera, motion and lighting
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
                          <span>{SETTING_LABELS[key] ?? key}</span>
                          <Select
                            disabled={disabled}
                            value={scene[field]}
                            onValueChange={(value) => changeScene(index, { [field]: value })}
                          >
                            <SelectTrigger
                              aria-label={`Scene ${index + 1} ${SETTING_LABELS[key] ?? key}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {choices.map((choice) => (
                                <SelectItem key={choice} value={choice}>
                                  {labelFor(choice)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </label>
                      );
                    })}
                  <label className="block space-y-1 text-xs font-medium sm:col-span-2">
                    Custom direction{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional, up to 500 characters)
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
                          View compiled prompt building blocks | v{template.promptVersion}
                        </summary>
                        <p className="text-muted-foreground mt-2 font-semibold">Template prompt</p>
                        <p className="bg-muted mt-1 rounded p-2 leading-relaxed">
                          {template.basePrompt}
                        </p>
                        {template.commonPrompt && (
                          <>
                            <p className="text-muted-foreground mt-2 font-semibold">
                              Shared product-preservation rules
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
      <div className="space-y-2 py-1">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="border-border/80 flex-1 border-t border-dashed" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled || scenes.length >= 4 || totalSeconds + 1 > 30}
            onClick={addScene}
            aria-label="Add scene"
            title="Add scene"
            className="border-primary/25 bg-background text-primary hover:border-primary/40 hover:bg-primary/5 size-9 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
            <span className="sr-only">Add scene</span>
          </Button>
          <span aria-hidden="true" className="border-border/80 flex-1 border-t border-dashed" />
        </div>
        {hasAiScenes && (
          <p className="text-muted-foreground text-center text-xs">
            Estimated MiniMax H3 footage ${(aiSceneSeconds * 0.08).toFixed(2)} USD at 768P
          </p>
        )}
      </div>
      <VideoTimelineEditor
        disabled={disabled}
        config={node.data.config as GenerateVideoConfig}
        assets={allAssets}
        onSave={(next) => {
          useWorkflowStore.getState().updateNodeConfig(nodeId, next);
          onChange(next.aiScenes ?? [], next.durationSeconds, next.aiGlobalInstructions ?? null);
        }}
      />
      <p className="text-muted-foreground text-xs leading-relaxed">
        The AI estimate assumes each AI clip is new; the final quote accounts for reusable clips
        before rendering. Standard scenes use smooth camera movement between the selected framing
        points. Keyframes can combine an approved product source with up to three visual references.
        Review AI clips and every generated keyframe for product fidelity.
      </p>
      <Dialog
        open={previewFrame !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewFrame(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="h-[90dvh] w-[calc(100%-2rem)] max-w-4xl border-0 bg-transparent p-0 shadow-none"
        >
          <button
            type="button"
            aria-label="Close image preview"
            onClick={() => setPreviewFrame(null)}
            data-taste-skill-ignore="dialog overlay shadow"
            className="absolute -top-9 right-0 z-10 inline-flex size-8 items-center justify-center text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <X aria-hidden="true" className="size-6" />
          </button>
          <DialogHeader className="sr-only">
            <DialogTitle>Image preview</DialogTitle>
            <DialogDescription>
              {previewFrame
                ? `Selected start frame image for scene ${previewFrame.scene}`
                : "Selected start frame image preview"}
            </DialogDescription>
          </DialogHeader>
          {previewFrame && (
            <div className="relative mx-auto h-full w-full">
              <Image
                src={previewFrame.url}
                alt={`Start frame image for scene ${previewFrame.scene}`}
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
  );
}
