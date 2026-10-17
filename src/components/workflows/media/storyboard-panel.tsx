"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StoryboardPlayer } from "@/components/workflows/media/storyboard-player";
import { VideoAssetsForm } from "@/components/workflows/media/video-assets-form";
import { VideoSceneCard } from "@/components/workflows/media/video-scene-card";
import { getErrorMessage } from "@/helpers/error-message";
import { resetVideoTemplateConfig } from "@/helpers/video-scenes";
import { readString, readStringArray } from "@/helpers/workflow-config";
import { usePreviewVideoStoryboard } from "@/hooks/mutations/use-preview-video-storyboard";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { generateVideoConfigSchema } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import type { VideoStoryboard } from "@/types/video-workflow";
import type { WorkflowNode } from "@/types/workflow";

const motionChoices = [
  ["gentle", "Gentle zoom in"], ["contain_gentle", "Gentle full-image motion"], ["static", "Static"],
  ["zoom", "Zoom in"], ["zoom_out", "Zoom out"], ["pan", "Pan right"], ["pan_left", "Pan left"],
  ["pan_up", "Pan up"], ["pan_down", "Pan down"], ["diagonal_up_right", "Diagonal up-right"],
  ["diagonal_up_left", "Diagonal up-left"], ["diagonal_down_right", "Diagonal down-right"],
  ["diagonal_down_left", "Diagonal down-left"],
] as const;

export const StoryboardPanel = ({ node }: { node: WorkflowNode }) => {
  const productId = useWorkflowStore(state => readString(state.nodes.find(n => n.data.type === "product-input")?.data.config.productId));
  const mockup = useWorkflowStore(state => state.nodes.find(n => n.data.type === "apply-mockup"));
  const locked = useWorkflowStore(state => state.isRunning && !state.nodes.some(n => n.data.type === "review-video" && n.data.status === "waiting_for_review"));
  const { data: assets = [] } = useMockupAssets(productId);
  const { mutate: preview, isPending } = usePreviewVideoStoryboard(true);
  const previewRef = useRef(preview);
  previewRef.current = preview;
  const [board, setBoard] = useState<VideoStoryboard | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const sequence = useRef(0);
  const outputSeconds = board ? (board.outputDurationFrames ?? board.durationSeconds * 30) / 30 : 0;
  const aiClipSeconds = board?.aiShots?.reduce((total, shot) => total + shot.durationSeconds, 0);
  const approvedRevisionKey = useMemo(() => assets.map(asset =>
    `${asset.id}:${asset.revision}:${asset.approvalStatus}:${asset.approvedRevision}`
  ).join("|"), [assets]);

  const requestPreview = useCallback((requestId: number) => {
    const parsed = generateVideoConfigSchema.safeParse(node.data.config);
    if (!productId || !parsed.success) {
      setBoard(null);
      setPreviewError(parsed.success ? "Select a product to preview the storyboard." : parsed.error.issues[0]?.message ?? "Check video settings.");
      return;
    }
    setPreviewError(null);
    previewRef.current({
      productId,
      config: parsed.data,
      mockupIds: readStringArray(mockup?.data.config.mockupIds),
      artworkGroupKey: readString(mockup?.data.config.artworkGroupKey),
    }, {
      onSuccess: result => {
        if (sequence.current !== requestId) return;
        setBoard(result);
        setPreviewError(null);
      },
      onError: error => {
        if (sequence.current !== requestId) return;
        setBoard(null);
        setPreviewError(getErrorMessage(error));
      },
    });
  }, [mockup?.data.config.artworkGroupKey, mockup?.data.config.mockupIds, node.data.config, productId]);

  useEffect(() => {
    const requestId = ++sequence.current;
    const timer = window.setTimeout(() => requestPreview(requestId), 450);
    return () => window.clearTimeout(timer);
  }, [approvedRevisionKey, requestPreview]);

  const refresh = () => {
    const requestId = ++sequence.current;
    requestPreview(requestId);
  };
  const sceneMotions = Array.isArray(node.data.config.sceneMotionPresets) ? node.data.config.sceneMotionPresets : [];
  const isAiSceneMode = readString(node.data.config.mode) === "ai_shot";
  const setSceneMotion = (index: number, value: string) => {
    const current = useWorkflowStore.getState().nodes.find(n => n.id === node.id);
    if (!current) return;
    const motions = Array.isArray(current.data.config.sceneMotionPresets) ? [...current.data.config.sceneMotionPresets] : [];
    motions[index] = value === "auto" ? null : value;
    useWorkflowStore.getState().updateNodeConfig(node.id, { ...current.data.config, sceneMotionPresets: motions });
  };
  const resetTemplate = () => {
    const current = useWorkflowStore.getState().nodes.find(n => n.id === node.id);
    if (!current) return;
    useWorkflowStore.getState().updateNodeConfig(node.id, resetVideoTemplateConfig(current.data.config));
  };

  return <section className="bg-card overflow-hidden rounded-xl border" aria-labelledby="storyboard-preview-title">
    <header className="flex items-start justify-between gap-4 p-4">
      <div className="min-w-0 space-y-1">
        <h3 id="storyboard-preview-title" className="text-base font-semibold">Storyboard preview</h3>
        <p className="text-muted-foreground text-xs leading-relaxed">Review the source frame and order of every scene before running the workflow.</p>
      </div>
      <Button type="button" variant="ghost" size="icon" aria-label="Refresh storyboard preview" title="Refresh preview" disabled={isPending || !productId} onClick={refresh}>
        <RefreshCw className={isPending ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
      </Button>
    </header>
    <div className="space-y-4 px-4 pb-4">
      {previewError && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200" role="status">{previewError}</p>}
      {!board && isPending && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Loading storyboard preview" role="status">
        {[0, 1, 2].map(item => <div key={item} className="bg-muted/60 aspect-[4/5] animate-pulse rounded-lg" />)}
        <span className="sr-only">Loading storyboard preview</span>
      </div>}
      {board && <>
        <StoryboardPlayer board={board} assets={assets} />
        <dl className="bg-muted/35 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg p-3 sm:grid-cols-4">
          <div><dt className="text-muted-foreground text-[11px]">Scenes</dt><dd className="mt-0.5 text-xs font-semibold">{board.scenes.length}</dd></div>
          <div><dt className="text-muted-foreground text-[11px]">Format</dt><dd className="mt-0.5 text-xs font-semibold">{board.aspectRatio} · {board.width} × {board.height}</dd></div>
          {aiClipSeconds != null && <div><dt className="text-muted-foreground text-[11px]">AI footage</dt><dd className="mt-0.5 text-xs font-semibold tabular-nums">{aiClipSeconds.toFixed(1)}s</dd></div>}
          <div><dt className="text-muted-foreground text-[11px]">Final duration</dt><dd className="mt-0.5 text-xs font-semibold tabular-nums">{outputSeconds.toFixed(1)}s</dd></div>
        </dl>
        {isAiSceneMode && <p className="text-muted-foreground text-xs leading-relaxed">These are source frames. Motion previews appear in each scene while Veo is generating, and the joined result appears below when all scenes are ready.</p>}
      </>}
    </div>
    {!isAiSceneMode && <div className="px-4 pb-4"><Accordion type="single" collapsible>
      <AccordionItem value="scene-editor">
        <AccordionTrigger>Edit scenes</AccordionTrigger>
        <AccordionContent className="space-y-4">
          <VideoAssetsForm node={node} assets={assets} disabled={locked} />
          <Button type="button" variant="outline" size="sm" disabled={locked} onClick={resetTemplate}>
            <RotateCcw className="size-4" aria-hidden="true" />Reset to template
          </Button>
          {board?.scenes.map(scene => <div key={scene.sceneOrder} className="space-y-2">
            <label className="text-xs font-medium" htmlFor={`scene-motion-${scene.sceneOrder}`}>Scene {scene.sceneOrder + 1} motion</label>
            <Select value={typeof sceneMotions[scene.sceneOrder] === "string" ? sceneMotions[scene.sceneOrder] : "auto"} onValueChange={value => setSceneMotion(scene.sceneOrder, value)} disabled={locked}>
              <SelectTrigger id={`scene-motion-${scene.sceneOrder}`} aria-label={`Scene ${scene.sceneOrder + 1} motion`} className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="auto">Use template motion</SelectItem>{motionChoices.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <VideoSceneCard scene={scene} asset={assets.find(asset => asset.id === scene.mockupId)} />
          </div>)}
        </AccordionContent>
      </AccordionItem>
    </Accordion></div>}
  </section>;
};
