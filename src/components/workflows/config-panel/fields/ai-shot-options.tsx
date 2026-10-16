"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, Copy, GripVertical, Minus, Plus, Trash2 } from "lucide-react";

import { generateAiStudioFrame, quoteAiStudioFrame, videoWorkflowKeys } from "@/api/video-workflow";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { readString, readStringArray } from "@/helpers/workflow-config";
import { useReviewMockupAsset } from "@/hooks/mutations/use-review-mockup-asset";
import { useAiVideoTemplates } from "@/hooks/queries/use-ai-video-templates";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useWorkflowStore } from "@/stores/workflow";
import type { AiVideoSceneOptions, AiVideoTemplateDefinition, GenerateVideoConfig, MockupAsset } from "@/types/video-workflow";

type LegacyOptions = NonNullable<GenerateVideoConfig["aiShotOptions"]>;
const BASE_SCENE: AiVideoSceneOptions = {
  mode: "ai", mockupId: null, templateCode: "cinematic_product_showcase", durationSeconds: 4,
  framing: "medium", cameraAngle: "three_quarter", cameraMovement: "push_in",
  subjectMotion: "minimal", motionIntensity: "subtle", lighting: "soft_studio",
  extraInstructions: null, rightsConfirmed: false, startFrameMode: "direct", studioLayout: "hanging_window", studioFrameId: null, studioPrompt: null,
};
const EMPTY_SCENES: AiVideoSceneOptions[] = [];

const SETTING_LABELS: Record<string, string> = {
  framing: "Framing", cameraAngle: "Camera angle", cameraMovement: "Camera movement",
  subjectMotion: "Subject motion", motionIntensity: "Motion intensity", lighting: "Lighting / mood",
};
const TEMPLATE_SETTING_FIELDS = ["framing", "cameraAngle", "cameraMovement", "subjectMotion", "motionIntensity", "lighting"] as const;
type TemplateSettingField = (typeof TEMPLATE_SETTING_FIELDS)[number];
const VALUE_LABELS: Record<string, string> = {
  wide: "Wide", medium: "Medium", medium_close: "Medium close-up", close_up: "Close-up", macro: "Macro",
  eye_level: "Eye level", three_quarter: "Three-quarter", low_angle: "Low angle", top_down: "Top-down",
  locked: "Locked camera", push_in: "Slow push-in", pull_back: "Slow pull-back", orbit_left: "Orbit left", orbit_right: "Orbit right",
  pan_left: "Pan left", pan_right: "Pan right", gentle_tracking: "Gentle tracking", subtle_handheld: "Subtle handheld",
  none: "No subject motion", minimal: "Minimal / restrained", natural: "Natural movement",
  subtle: "Subtle", balanced: "Balanced", soft_studio: "Soft studio", bright_clean: "Bright and clean",
  cool_modern: "Cool modern", moody_cinematic: "Moody cinematic", warm_natural: "Warm natural", golden_hour: "Golden hour",
};

function convertLegacy(legacy: LegacyOptions | undefined, definition?: AiVideoTemplateDefinition, legacyDuration = 4): AiVideoSceneOptions[] {
  const templateCode = legacy?.concept === "material_detail" ? "macro_detail_reveal"
    : legacy?.concept === "lifestyle_motion" ? "lifestyle_in_use"
      : legacy?.concept === "product_in_use" ? "creator_pov_ugc" : "cinematic_product_showcase";
  const duration = legacy?.coverage === "full_video" ? 8 : legacy ? 6 : 4;
  const defaults = definition?.defaults ?? BASE_SCENE;
  const first = { ...BASE_SCENE, ...defaults, templateCode, durationSeconds: duration as 4 | 6 | 8,
    mockupId: legacy?.mockupId ?? legacy?.fullSceneMockupIds?.[0] ?? null,
    extraInstructions: legacy?.prompt ?? null, rightsConfirmed: legacy?.rightsConfirmed ?? false };
  if (legacy?.coverage !== "full_video" || legacyDuration !== 15) return [first];
  const second = { ...first, durationSeconds: 6 as const,
    mockupId: legacy.fullSceneMockupIds?.[1] ?? null };
  return [first, second];
}

const labelFor = (value: string) => VALUE_LABELS[value] ?? value.replaceAll("_", " ");

function normalizeTemplateSettings(scene: AiVideoSceneOptions, template: AiVideoTemplateDefinition): AiVideoSceneOptions {
  let normalized = { ...scene, mode: "ai" as const };
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

function sourceAssetsFor(template: AiVideoTemplateDefinition | undefined, assets: MockupAsset[]) {
  if (template?.requiresLifestyle) return assets.filter(asset => asset.role === "Lifestyle");
  if (template?.requiresDetail) return assets.filter(asset => {
    const hasFullDetail = asset.role === "ArtworkDetail" && Math.min(asset.width, asset.height) >= 512;
    const hasLargeRegion = [asset.regions.detail, asset.regions.artwork].some(region => region != null &&
      Math.min(asset.width * region.width, asset.height * region.height) >= 512);
    return hasFullDetail || hasLargeRegion;
  });
  return assets;
}

function autoSourceFor(template: AiVideoTemplateDefinition | undefined, sources: MockupAsset[]) {
  if (!sources.length) return undefined;
  if (template?.requiresLifestyle || template?.requiresDetail) return sources[0];
  return sources.find(asset => asset.role === "Hero") ?? sources[0];
}

type StudioFrameMetadata = { sourceMockupId: string; sourceRevision: number; layout: string; aspectRatio: string; promptVersion: number; customPrompt?: string | null };
function studioMetadata(asset: MockupAsset): StudioFrameMetadata | undefined {
  return (asset.regions as typeof asset.regions & { studioFrame?: StudioFrameMetadata }).studioFrame;
}
const normalizeStudioLayout = (layout: string | null | undefined): "hanging_window" | "flat_lay" | "none" => layout === "flat_lay" || layout === "none" ? layout : "hanging_window";

function MockupOption({ asset }: { asset: MockupAsset }) {
  return <SelectItem value={asset.id}>
    <span className="flex min-w-0 items-center gap-2">
      <Image src={asset.previewUrl} alt="" width={40} height={40} unoptimized className="bg-background size-10 shrink-0 rounded border object-contain" />
      <span className="min-w-0 truncate">{asset.role} | {asset.width}x{asset.height} | {asset.variantKey || asset.id.slice(0, 6)}</span>
    </span>
  </SelectItem>;
}

export function AiShotOptions({ nodeId, disabled, onChange }: {
  nodeId: string;
  disabled: boolean;
  onChange: (scenes: AiVideoSceneOptions[], seconds: number, sharedInstructions?: string | null) => void;
}) {
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedForMove, setSelectedForMove] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [preparingSceneIndex, setPreparingSceneIndex] = useState<number | null>(null);
  const node = useWorkflowStore(state => state.nodes.find(item => item.id === nodeId));
  const productId = useWorkflowStore(state => readString(state.nodes.find(item => item.data.type === "product-input")?.data.config.productId));
  const applyMockupNode = useWorkflowStore(state => state.nodes.find(item => item.data.type === "apply-mockup"));
  const { data: catalog = [], isPending, isError, refetch } = useAiVideoTemplates();
  const { data: allAssets = [], isPending: areAssetsLoading } = useMockupAssets(productId);
  const queryClient = useAppQueryClient();
  const { mutate: reviewStudioFrame, isPending: isReviewingStudioFrame } = useReviewMockupAsset();
  const chosenMockupIds = readStringArray(applyMockupNode?.data.config.mockupIds);
  const artworkGroupKey = readString(applyMockupNode?.data.config.artworkGroupKey);
  const sharedInstructions = typeof node?.data.config.aiGlobalInstructions === "string" ? node.data.config.aiGlobalInstructions : null;
  const legacyStudioMode = node?.data.config.aiStudioMode === "studio";
  const allOriginalApproved = allAssets.filter(asset => asset.approvalStatus === "approved" && asset.approvedRevision === asset.revision)
    .filter(asset => asset.role !== "VideoScene");
  const approved = allAssets.filter(asset => asset.approvalStatus === "approved" && asset.approvedRevision === asset.revision)
    .filter(asset => chosenMockupIds.length === 0 || chosenMockupIds.includes(asset.id))
    .filter(asset => !artworkGroupKey || asset.artworkGroupKey === artworkGroupKey);
  const originalApproved = approved.filter(asset => asset.role !== "VideoScene");
  const rawScenes = (node?.data.config.aiScenes as AiVideoSceneOptions[] | undefined) ?? EMPTY_SCENES;
  const scenes = rawScenes.map(scene => {
    const template = catalog.find(item => item.code === scene.templateCode);
    const migrated = scene.startFrameMode == null && scene.templateCode === "cinematic_product_showcase"
      ? { ...scene, startFrameMode: legacyStudioMode ? "studio" as const : "direct" as const,
        studioLayout: scene.studioLayout ?? (node?.data.config.aiStudioLayout === "flat_lay" ? "flat_lay" as const : "hanging_window" as const),
        studioFrameId: scene.studioFrameId ?? (legacyStudioMode ? readString(node?.data.config.aiStudioFrameId) || null : null) }
      : scene;
    const withFrameDefaults = migrated.templateCode === "cinematic_product_showcase"
      ? { ...migrated, studioLayout: normalizeStudioLayout(migrated.studioLayout) }
      : migrated;
    return template ? normalizeTemplateSettings(withFrameDefaults, template) : { ...withFrameDefaults, mode: "ai" as const };
  });
  const outputFormat = readString(node?.data.config.outputFormat) || "portrait";

  useEffect(() => {
    if (!node || scenes.length > 0) return;
    const legacy = node.data.config.aiShotOptions as LegacyOptions | undefined;
    const legacyTemplateCode = legacy?.concept === "material_detail" ? "macro_detail_reveal"
      : legacy?.concept === "lifestyle_motion" ? "lifestyle_in_use"
        : legacy?.concept === "product_in_use" ? "creator_pov_ugc" : "cinematic_product_showcase";
    const migrated = convertLegacy(legacy, catalog.find(item => item.code === legacyTemplateCode), Number(node.data.config.durationSeconds ?? 4));
    const seconds = migrated.reduce((sum, scene) => sum + scene.durationSeconds, 0);
    const { aiShotOptions: _old, ...cleanConfig } = node.data.config;
    useWorkflowStore.getState().updateNodeConfig(nodeId, { ...cleanConfig, mode: "ai_shot", aiScenes: migrated, durationSeconds: seconds });
    onChange(migrated, seconds, sharedInstructions);
  }, [node, nodeId, scenes.length, catalog, onChange, sharedInstructions]);

  useEffect(() => {
    if (!node || rawScenes.length === 0 || areAssetsLoading || !productId) return;
    const normalizedScenes = rawScenes.map(scene => {
      const template = catalog.find(item => item.code === scene.templateCode);
      const sceneSources = sourceAssetsFor(template, originalApproved);
      const validMockupId = scene.mockupId && sceneSources.some(asset => asset.id === scene.mockupId) ? scene.mockupId : null;
      const migrated = scene.startFrameMode == null && scene.templateCode === "cinematic_product_showcase"
        ? { ...scene, mockupId: validMockupId, startFrameMode: legacyStudioMode ? "studio" as const : "direct" as const,
          studioLayout: scene.studioLayout ?? (node.data.config.aiStudioLayout === "flat_lay" ? "flat_lay" as const : "hanging_window" as const),
          studioFrameId: scene.studioFrameId ?? (legacyStudioMode ? readString(node.data.config.aiStudioFrameId) || null : null) }
        : { ...scene, mockupId: validMockupId };
      const withFrameDefaults = migrated.templateCode === "cinematic_product_showcase"
        ? { ...migrated, studioLayout: normalizeStudioLayout(migrated.studioLayout) }
        : migrated;
      return template ? normalizeTemplateSettings(withFrameDefaults, template) : { ...withFrameDefaults, mode: "ai" as const };
    });
    const needsNormalization = node.data.config.mode !== "ai_shot" || rawScenes.some((scene, index) =>
      scene.mode !== "ai" || TEMPLATE_SETTING_FIELDS.some(field => scene[field] !== normalizedScenes[index]?.[field]) ||
      scene.templateCode === "cinematic_product_showcase" && scene.startFrameMode == null ||
      scene.templateCode === "cinematic_product_showcase" && scene.studioLayout !== normalizedScenes[index]?.studioLayout ||
      scene.mockupId !== normalizedScenes[index]?.mockupId,
    );
    if (!needsNormalization) return;
    const seconds = normalizedScenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
    useWorkflowStore.getState().updateNodeConfig(nodeId, { ...node.data.config, mode: "ai_shot", aiScenes: normalizedScenes, durationSeconds: seconds });
    onChange(normalizedScenes, seconds, sharedInstructions);
  }, [node, nodeId, rawScenes, catalog, onChange, sharedInstructions, legacyStudioMode, originalApproved, areAssetsLoading, productId]);

  if (!node) return null;
  const update = (next: AiVideoSceneOptions[], nextSharedInstructions: string | null = sharedInstructions) => {
    const seconds = next.reduce((sum, scene) => sum + scene.durationSeconds, 0);
    const { aiShotOptions: _old, ...cleanConfig } = node.data.config;
    useWorkflowStore.getState().updateNodeConfig(nodeId, { ...cleanConfig, mode: "ai_shot", aiScenes: next, aiGlobalInstructions: nextSharedInstructions, durationSeconds: seconds });
    onChange(next, seconds, nextSharedInstructions);
  };
  const prepareStudioFrame = async (sceneIndex: number, regenerate = false) => {
    const scene = scenes[sceneIndex];
    const sceneTemplate = scene && catalog.find(item => item.code === scene.templateCode);
    const sources = sourceAssetsFor(sceneTemplate, originalApproved);
    const source = scene?.mockupId ? sources.find(asset => asset.id === scene.mockupId) : autoSourceFor(sceneTemplate, sources);
    if (!scene || !source || !productId) return;
    const layout = normalizeStudioLayout(scene.studioLayout);
    setPreparingSceneIndex(sceneIndex);
      const customPrompt = scene.studioPrompt?.trim() || null;
      const request = { productId, sourceMockupId: source.id, layout, outputFormat, customPrompt, regenerate };
    try {
      const quote = await quoteAiStudioFrame(request);
      if (quote.existingFrame) {
        const frame = quote.existingFrame;
        queryClient.setQueryData<MockupAsset[]>(videoWorkflowKeys.assets(productId), old => [frame, ...(old ?? []).filter(asset => asset.id !== frame.id)]);
        changeScene(sceneIndex, { startFrameMode: "studio", studioLayout: layout, studioFrameId: frame.id });
        showToast("success", frame.approvalStatus === "approved" && frame.approvedRevision === frame.revision
          ? "Matching approved keyframe selected. No new image was generated."
          : "Matching keyframe found. Review and approve it before using it in video.");
        return;
      }
      const estimate = quote.estimatedCostUsd.toFixed(2);
      const layoutDescription = layout === "flat_lay" ? "surface display" : layout === "hanging_window" ? "upright display" : "custom composition";
      const confirmed = window.confirm(`Generate one ${layoutDescription} keyframe with Gemini Image? Estimated image cost: $${estimate} USD. This is charged separately from Veo video generation.`);
      if (!confirmed) return;
      const result = await generateAiStudioFrame({ ...request, expectedFingerprint: quote.fingerprint, confirmedEstimatedCostUsd: quote.estimatedCostUsd });
      const frame = result.frame;
      queryClient.setQueryData<MockupAsset[]>(videoWorkflowKeys.assets(productId), old => [frame, ...(old ?? []).filter(asset => asset.id !== frame.id)]);
      changeScene(sceneIndex, { startFrameMode: "studio", studioLayout: layout, studioFrameId: frame.id });
      showToast("success", `Keyframe created. Review and approve it before generating video; estimated image cost: $${result.estimatedCostUsd.toFixed(2)} USD.`);
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setPreparingSceneIndex(null);
    }
  };
  const changeScene = (index: number, changes: Partial<AiVideoSceneOptions>) => update(scenes.map((scene, position) => position === index ? { ...scene, ...changes } : scene));
  const moveScene = (index: number, nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= scenes.length) return;
    const next = [...scenes];
    const [moved] = next.splice(index, 1);
    next.splice(nextIndex, 0, moved!);
    update(next);
    setAnnouncement(`Scene moved to position ${nextIndex + 1} of ${scenes.length}.`);
  };
  const totalSeconds = scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
  const copyScene = (index: number) => {
    const scene = scenes[index];
    if (!scene || scenes.length >= 4 || totalSeconds + scene.durationSeconds > 30) return;
    update([...scenes.slice(0, index + 1), { ...scene, mode: "ai" }, ...scenes.slice(index + 1)]);
  };
  const addScene = () => {
    if (scenes.length >= 4 || scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0) + 4 > 30) return;
    const definition = catalog.find(item => item.code === "cinematic_product_showcase");
    update([...scenes, { ...BASE_SCENE, ...(definition?.defaults ?? {}), mockupId: null, extraInstructions: null, rightsConfirmed: false }]);
  };

  return <section className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/40 p-3" aria-label="AI scene setup">
    <div className="space-y-2">
      <div><p className="text-sm font-semibold">Scenes</p><p className="text-muted-foreground mt-1 text-xs">Set each scene separately. Drag the grip, or select a grip then a destination scene to reorder.</p></div>
      <div className="bg-background grid grid-cols-[auto_minmax(3rem,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2" aria-label={`Total video duration ${totalSeconds} of 30 seconds`}>
        <p className="text-foreground text-sm font-semibold whitespace-nowrap tabular-nums">{totalSeconds}s / 30s</p>
        <div role="progressbar" aria-label="Video duration" aria-valuemin={0} aria-valuemax={30} aria-valuenow={Math.min(totalSeconds, 30)} aria-valuetext={`${totalSeconds} of 30 seconds`} className="bg-muted h-2 min-w-0 overflow-hidden rounded-full">
          <div className="h-full rounded-full bg-teal-600 transition-[width] duration-200" style={{ width: `${Math.min((totalSeconds / 30) * 100, 100)}%` }} />
        </div>
        <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">{scenes.length} {scenes.length === 1 ? "scene" : "scenes"}</span>
      </div>
    </div>
    <label className="block space-y-1 text-xs font-medium">Shared direction for all scenes <span className="text-muted-foreground font-normal">(optional, up to 500 characters)</span>
      <textarea disabled={disabled} maxLength={500} value={sharedInstructions ?? ""} onChange={event => update(scenes, event.target.value.trim() ? event.target.value : null)} placeholder="E.g. maintain a warm, premium studio look throughout; keep the artwork facing the camera." className="bg-background min-h-16 w-full rounded-md border p-2 text-sm font-normal" />
      <span className="text-muted-foreground block text-right text-[11px] font-normal">{sharedInstructions?.length ?? 0}/500  |  appended before product-preservation guardrails</span>
    </label>
    {isPending && <p className="text-muted-foreground text-xs">Loading AI scene templates... </p>}
    {isError && <div className="flex items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900"><span>Could not load the AI template catalog. Your scene settings are preserved.</span><Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>Retry</Button></div>}
    <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    {scenes.map((scene, index) => {
      const template = catalog.find(item => item.code === scene.templateCode);
    const sources = sourceAssetsFor(template, originalApproved);
      const hasRequiredSource = sources.length > 0;
      const selectedSource = (scene.mockupId ? sources.find(asset => asset.id === scene.mockupId) : undefined)
        ?? autoSourceFor(template, sources);
      const selectedSourceValue = scene.mockupId && sources.some(asset => asset.id === scene.mockupId) ? scene.mockupId : "auto";
      const sceneFrame = allAssets.find(asset => asset.id === scene.studioFrameId);
      const studioLayout = normalizeStudioLayout(scene.studioLayout);
      const outputAspect = outputFormat === "landscape" ? "16:9" : outputFormat === "square" ? "1:1" : "9:16";
      const reusableStudioFrames = allAssets.filter(frame => {
        const metadata = studioMetadata(frame);
        const original = metadata && allOriginalApproved.find(asset => asset.id === metadata.sourceMockupId);
        const scenePrompt = scene.studioPrompt?.trim() ?? "";
        const promptMatches = metadata?.promptVersion === 2
          ? !scenePrompt && !metadata.customPrompt
          : metadata?.promptVersion === 3 && (metadata.customPrompt ?? "") === scenePrompt;
        return frame.sourceType === "ai_generated" && frame.role === "VideoScene" &&
          frame.approvalStatus === "approved" && frame.approvedRevision === frame.revision &&
          promptMatches && ["hanging_window", "flat_lay", "none"].includes(metadata?.layout ?? "") &&
          metadata?.aspectRatio === outputAspect &&
          sources.some(asset => asset.id === metadata.sourceMockupId) &&
          !!original && original.revision === metadata.sourceRevision;
      });
      const selectedSourceFrame = reusableStudioFrames.find(frame => frame.id === scene.studioFrameId);
      const existingAssetValue = selectedSourceFrame ? `frame:${selectedSourceFrame.id}` : selectedSourceValue;
      const otherDuration = totalSeconds - scene.durationSeconds;
      const maxDuration = [8, 6, 4].find(seconds => otherDuration + seconds <= 30) ?? scene.durationSeconds;
      const canDuplicate = scenes.length < 4 && totalSeconds + scene.durationSeconds <= 30;
      return <article key={`ai-scene-${index}`} onDragOver={event => { if (dragIndex.current !== null) event.preventDefault(); }} onDrop={event => {
        event.preventDefault();
        const from = Number(event.dataTransfer.getData("text/plain"));
        if (Number.isInteger(from)) moveScene(from, index);
        dragIndex.current = null;
        setDragOverIndex(null);
      }} className={`bg-background space-y-3 rounded-lg border p-3 transition-colors ${dragOverIndex === index || selectedForMove === index ? "border-primary ring-primary/20 ring-2" : ""}`}>
        <header className="flex items-center gap-2">
          <h3 className="bg-background flex size-7 items-center justify-center rounded-md border text-sm font-semibold tabular-nums"><span className="sr-only">Scene </span>{index + 1}</h3>
          <Select disabled={disabled} value={scene.mode ?? "ai"} onValueChange={value => changeScene(index, { mode: value as "ai" })}>
              <SelectTrigger className="h-8 w-28 shrink-0" aria-label={`Scene ${index + 1} generation mode`}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ai">AI video</SelectItem><SelectItem value="standard" disabled>Standard</SelectItem></SelectContent>
          </Select>
          <div className="flex max-w-56 min-w-0 flex-1 items-center gap-1">
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Decrease scene ${index + 1} duration`} disabled={disabled || scene.durationSeconds <= 4} onClick={() => changeScene(index, { durationSeconds: Math.max(4, scene.durationSeconds - 2) as 4 | 6 | 8 })}><Minus aria-hidden="true" /></Button>
            <input type="range" min={4} max={maxDuration} step={2} value={scene.durationSeconds} disabled={disabled} aria-label={`Scene ${index + 1} duration`} onChange={event => changeScene(index, { durationSeconds: Number(event.target.value) as 4 | 6 | 8 })} className="accent-primary h-2 min-w-0 flex-1 cursor-pointer disabled:cursor-not-allowed" />
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Increase scene ${index + 1} duration`} disabled={disabled || scene.durationSeconds >= maxDuration} onClick={() => changeScene(index, { durationSeconds: Math.min(maxDuration, scene.durationSeconds + 2) as 4 | 6 | 8 })}><Plus aria-hidden="true" /></Button>
            <span className="min-w-8 text-right text-xs font-semibold tabular-nums">{scene.durationSeconds}s</span>
          </div>
          <div className="ml-auto flex shrink-0 items-center">
            <Button type="button" variant="ghost" size="icon-sm" className="cursor-grab active:cursor-grabbing" aria-label={`Drag scene ${index + 1}; use arrow keys to reorder`} title="Reorder with arrow keys when focused" disabled={disabled} draggable={!disabled} onDragStart={event => {
              dragIndex.current = index;
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", String(index));
              setDragOverIndex(index);
            }} onDragEnter={() => setDragOverIndex(index)} onDragEnd={() => { dragIndex.current = null; setDragOverIndex(null); }} onKeyDown={event => {
              if (event.key === "ArrowUp" && index > 0) { event.preventDefault(); moveScene(index, index - 1); }
              if (event.key === "ArrowDown" && index < scenes.length - 1) { event.preventDefault(); moveScene(index, index + 1); }
            }} onClick={() => {
              if (selectedForMove === null) {
                setSelectedForMove(index);
                setAnnouncement(`Scene ${index + 1} selected. Select another scene to move it.`);
              } else if (selectedForMove === index) {
                setSelectedForMove(null);
                setAnnouncement("Scene move cancelled.");
              } else {
                moveScene(selectedForMove, index);
                setSelectedForMove(null);
              }
            }}><GripVertical aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Copy scene ${index + 1}`} title="Copy scene" disabled={disabled || !canDuplicate} onClick={() => copyScene(index)}><Copy aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove scene ${index + 1}`} disabled={disabled || scenes.length <= 1} onClick={() => update(scenes.filter((_, position) => position !== index))} className="text-destructive hover:text-destructive"><Trash2 aria-hidden="true" /></Button>
          </div>
        </header>
        <label className="block space-y-1 text-xs font-medium">AI template
          <Select disabled={disabled || isPending || catalog.length === 0} value={scene.templateCode} onValueChange={value => {
            const nextTemplate = catalog.find(item => item.code === value);
            if (!nextTemplate) return;
                changeScene(index, { ...nextTemplate.defaults, mode: "ai", templateCode: nextTemplate.code, mockupId: null, extraInstructions: null, rightsConfirmed: false, startFrameMode: "direct", studioLayout: "hanging_window", studioFrameId: null, studioPrompt: null });
          }}>
            <SelectTrigger aria-label={`Scene ${index + 1} AI template`}><SelectValue /></SelectTrigger><SelectContent>{catalog.map(item => <SelectItem key={item.code} value={item.code}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
        </label>
                {template && <p className="text-muted-foreground text-xs leading-relaxed">{template.description}</p>}
        <section className="space-y-3 rounded-md border p-3" aria-label={`Scene ${index + 1} start frame`}>
          <div><p className="text-sm font-semibold">Start frame</p><p className="text-muted-foreground mt-1 text-xs">Use an approved source image or keyframe, or create a keyframe that fits this scene.</p></div>
          <Select disabled={disabled} value={selectedSourceFrame ? "direct" : scene.startFrameMode ?? "direct"} onValueChange={value => changeScene(index, {
            startFrameMode: value as "direct" | "studio",
            studioFrameId: null,
            studioLayout,
          })}>
            <SelectTrigger aria-label={`Scene ${index + 1} start frame source`}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="direct">Use an approved asset</SelectItem><SelectItem value="studio">Create a new keyframe</SelectItem></SelectContent>
          </Select>
          {scene.startFrameMode !== "studio" || selectedSourceFrame ? <div className="min-w-0 space-y-3">
            <label className="block space-y-1 text-xs font-medium">Choose an approved product image or keyframe
              <Select disabled={disabled || (!hasRequiredSource && reusableStudioFrames.length === 0)} value={existingAssetValue} onValueChange={value => {
                if (value.startsWith("frame:")) {
                  const frame = reusableStudioFrames.find(item => item.id === value.slice(6));
                  const metadata = frame && studioMetadata(frame);
                  changeScene(index, { startFrameMode: "studio", mockupId: metadata?.sourceMockupId ?? null, studioFrameId: value.slice(6), ...(metadata && { studioLayout: metadata.layout as "hanging_window" | "flat_lay" | "none" }) });
                } else changeScene(index, { startFrameMode: "direct", mockupId: value === "auto" ? null : value, studioFrameId: null });
              }}>
                <SelectTrigger className="w-full" aria-label={`Scene ${index + 1} approved mockup`}><SelectValue /></SelectTrigger><SelectContent>
                  <SelectItem value="auto">Auto-select suitable image</SelectItem>
                  {sources.map(asset => <MockupOption key={asset.id} asset={asset} />)}
                  {reusableStudioFrames.map(frame => <SelectItem key={frame.id} value={`frame:${frame.id}`}><span className="flex min-w-0 items-center gap-2"><Image src={frame.previewUrl} alt="" width={40} height={40} unoptimized className="bg-background size-10 shrink-0 rounded border object-contain" /><span className="min-w-0 truncate">Approved keyframe | r{frame.revision}</span></span></SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            {(selectedSourceFrame || selectedSource) && <figure className="flex items-center gap-3">
              <div className="bg-background relative size-24 shrink-0 overflow-hidden rounded-md border"><Image src={(selectedSourceFrame ?? selectedSource!).previewUrl} alt={`${selectedSourceFrame ? "Keyframe" : selectedSource!.role} preview for scene ${index + 1}`} fill sizes="96px" unoptimized className="object-contain" /></div>
              <figcaption className="text-muted-foreground text-xs">{selectedSourceFrame ? `Approved keyframe | r${selectedSourceFrame.revision}` : `${selectedSource!.role}  |  ${selectedSource!.width}x${selectedSource!.height}${selectedSource!.variantKey ? `  |  ${selectedSource!.variantKey}` : ""}`}</figcaption>
            </figure>}
          </div> : <div className="space-y-3">
            <label className="block space-y-1 text-xs font-medium">Keyframe template
              <Select disabled={disabled} value={studioLayout} onValueChange={value => changeScene(index, { studioLayout: value as "hanging_window" | "flat_lay" | "none", studioFrameId: null })}>
                <SelectTrigger aria-label={`Scene ${index + 1} keyframe template`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hanging_window">Upright / hanging display</SelectItem><SelectItem value="flat_lay">Placed on a surface</SelectItem><SelectItem value="none">None | follow my custom prompt</SelectItem></SelectContent>
              </Select>
              {selectedSource?.role === "Lifestyle" && <span className="text-muted-foreground block font-normal">The approved people and setting stay in the image.</span>}
            </label>
            <label className="block space-y-1 text-xs font-medium">Custom keyframe direction <span className="text-muted-foreground font-normal">(optional, up to 500 characters)</span>
              <textarea disabled={disabled} maxLength={500} value={scene.studioPrompt ?? ""} onChange={event => changeScene(index, { studioPrompt: event.currentTarget.value || null })} placeholder="E.g. use soft morning window light and keep the product slightly off-center. Select None above to leave staging to your prompt." className="bg-background min-h-20 w-full rounded-md border p-2 text-sm font-normal" />
              <span className="text-muted-foreground block text-right text-[11px] font-normal">{scene.studioPrompt?.length ?? 0}/500</span>
            </label>
            {sceneFrame && <div className="flex items-center gap-3">
              <figure className="bg-background relative size-16 shrink-0 overflow-hidden rounded border"><Image src={sceneFrame.previewUrl} alt={`Scene ${index + 1} studio keyframe preview`} fill sizes="64px" unoptimized className="object-contain" /></figure>
              <div className="min-w-0 flex-1 text-xs"><p className="font-medium">Generated keyframe  |  {sceneFrame.approvalStatus}  |  r{sceneFrame.revision}</p><p className="text-muted-foreground">{sceneFrame.approvalStatus === "pending" ? "Approve this image before generating video." : sceneFrame.approvalStatus === "approved" && sceneFrame.approvedRevision === sceneFrame.revision && reusableStudioFrames.some(frame => frame.id === sceneFrame.id) ? "Ready to use in this scene." : sceneFrame.approvalStatus === "approved" ? "This keyframe does not match the current source, video format or custom direction. Choose or create a matching keyframe." : "This keyframe was rejected."}</p>
                {sceneFrame.approvalStatus === "pending" && <div className="mt-2 flex flex-wrap gap-2"><Button type="button" size="sm" disabled={disabled || isReviewingStudioFrame} onClick={() => reviewStudioFrame({ id: sceneFrame.id, revision: sceneFrame.revision, approved: true })}>Approve</Button><Button type="button" size="sm" variant="outline" disabled={disabled || isReviewingStudioFrame} onClick={() => reviewStudioFrame({ id: sceneFrame.id, revision: sceneFrame.revision, approved: false })}>Reject</Button></div>}
              </div>
            </div>}
              <div className="space-y-3 border-t pt-3">
                <p className="text-muted-foreground text-xs">Create a tailored keyframe from an approved source. The image estimate is shown before generation; approve the result before using it in a scene.</p>
                <label className="block space-y-1 text-xs font-medium">Generate from an approved product image
                  <Select disabled={disabled || !hasRequiredSource} value={selectedSourceValue} onValueChange={value => changeScene(index, { mockupId: value === "auto" ? null : value })}>
                    <SelectTrigger aria-label={`Scene ${index + 1} mockup source for new keyframe`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Auto-select suitable image</SelectItem>{sources.map(asset => <MockupOption key={asset.id} asset={asset} />)}</SelectContent>
                  </Select>
                </label>
                <div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={disabled || !selectedSource || preparingSceneIndex !== null} onClick={() => void prepareStudioFrame(index)}>{preparingSceneIndex === index ? "Checking keyframe..." : "Use or create matching keyframe"}</Button>{sceneFrame && <Button type="button" size="sm" variant="ghost" disabled={disabled || !selectedSource || preparingSceneIndex !== null} onClick={() => void prepareStudioFrame(index, true)}>{preparingSceneIndex === index ? "Preparing..." : "Generate another"}</Button>}</div>
                <p className="text-muted-foreground text-xs">A matching approved keyframe uses no new image call. New keyframes need approval before they can be used.</p>
              </div>
          </div>}
        </section>
        {!hasRequiredSource && <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs leading-relaxed text-amber-900">
          {template?.requiresLifestyle ? "This scene needs an approved Lifestyle image with the adult already in frame. Generate one from an adult reference photo or upload and approve it; the video model will not invent a person." : template?.requiresDetail ? "A white-background mockup is okay: mark the artwork/detail region on its approved image, or add an approved close-up image. The app can crop the marked region if it is large enough." : "Approve at least one product mockup before generating this scene."} {chosenMockupIds.length > 0 || artworkGroupKey ? "Also check that the image is included in Apply Mockup's allowed images and selected artwork group." : ""}
        </p>}
        {template?.requiresLifestyle && <label className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" disabled={disabled} checked={scene.rightsConfirmed} onChange={event => changeScene(index, { rightsConfirmed: event.target.checked })} className="mt-1" /><span>I have the rights to use the adult already visible in this Lifestyle image.</span></label>}
        <details className="group bg-muted/20 rounded-md border p-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold">Advanced camera, motion and lighting<ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {template && Object.entries(template.allowedSettings).map(([key, choices]) => {
              const field = key as TemplateSettingField;
              return <label key={key} className="block space-y-1 text-xs font-medium">{SETTING_LABELS[key] ?? key}
                <Select disabled={disabled} value={scene[field]} onValueChange={value => changeScene(index, { [field]: value })}>
                  <SelectTrigger aria-label={`Scene ${index + 1} ${SETTING_LABELS[key] ?? key}`}><SelectValue /></SelectTrigger><SelectContent>{choices.map(choice => <SelectItem key={choice} value={choice}>{labelFor(choice)}</SelectItem>)}</SelectContent>
                </Select>
              </label>;
            })}
            <label className="block space-y-1 text-xs font-medium sm:col-span-2">Custom direction <span className="text-muted-foreground font-normal">(optional, up to 500 characters)</span>
              <textarea disabled={disabled} maxLength={500} value={scene.extraInstructions ?? ""} onChange={event => changeScene(index, { extraInstructions: event.target.value || null })} placeholder="E.g. keep the printed artwork centered and readable; use a slow left-to-right move." className="bg-background min-h-20 w-full rounded-md border p-2 text-sm font-normal" />
            </label>
            {template?.basePrompt && <div className="sm:col-span-2"><details className="text-xs"><summary className="text-muted-foreground cursor-pointer">View compiled prompt building blocks  |  v{template.promptVersion}</summary><p className="text-muted-foreground mt-2 font-semibold">Template prompt</p><p className="bg-muted mt-1 rounded p-2 leading-relaxed">{template.basePrompt}</p>{template.commonPrompt && <><p className="text-muted-foreground mt-2 font-semibold">Shared product-preservation rules</p><p className="bg-muted mt-1 rounded p-2 leading-relaxed">{template.commonPrompt}</p></>}</details></div>}
          </div>
        </details>
      </article>;
    })}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-muted-foreground text-xs">Estimated generation ${(totalSeconds * 0.1).toFixed(2)} USD</p>
      <Button type="button" variant="outline" size="sm" disabled={disabled || scenes.length >= 4 || totalSeconds + 4 > 30 || catalog.length === 0} onClick={addScene}><Plus aria-hidden="true" /> Add scene</Button>
    </div>
    <p className="text-muted-foreground text-xs leading-relaxed">The estimate assumes every clip is new; the final quote accounts for reusable scenes and is confirmed before rendering. Macro scenes use a marked artwork crop when needed; person-based templates only animate a person already visible in an approved Lifestyle image. Review every generated scene for product fidelity.</p>
  </section>;
}
