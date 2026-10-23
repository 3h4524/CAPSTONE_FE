"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StoryboardPlayer } from "@/components/workflows/media/storyboard-player";
import { getErrorMessage } from "@/helpers/error-message";
import { readString, readStringArray } from "@/helpers/workflow-config";
import { usePreviewVideoStoryboard } from "@/hooks/mutations/use-preview-video-storyboard";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { generateVideoConfigSchema } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import type { GenerateVideoConfig, VideoStoryboard } from "@/types/video-workflow";
import type { WorkflowNode } from "@/types/workflow";

const VALID_MOTIONS = new Set([
  "gentle",
  "contain_gentle",
  "static",
  "pan",
  "zoom",
  "zoom_out",
  "pan_left",
  "pan_up",
  "pan_down",
  "diagonal_up_right",
  "diagonal_up_left",
  "diagonal_down_right",
  "diagonal_down_left",
  "rotate_cw",
  "rotate_ccw",
  "rotate_zoom_cw",
  "rotate_zoom_ccw",
  "custom",
]);

// Saved workflows can contain retired motion values (for example `push_in`).
// Keep preview non-blocking; scene editing belongs in the dedicated scene editor.
const previewConfig = (config: GenerateVideoConfig): GenerateVideoConfig => ({
  ...config,
  standardOptions: {
    ...config.standardOptions,
    motionPreset: VALID_MOTIONS.has(config.standardOptions.motionPreset)
      ? config.standardOptions.motionPreset
      : "zoom",
  },
  sceneMotionPresets: config.sceneMotionPresets?.map((motion) =>
    motion && VALID_MOTIONS.has(motion) ? motion : null
  ),
  aiScenes: config.aiScenes?.map((scene) => ({
    ...scene,
    standardMotionPreset:
      scene.standardMotionPreset && VALID_MOTIONS.has(scene.standardMotionPreset)
        ? scene.standardMotionPreset
        : undefined,
  })),
});

export const StoryboardPanel = ({ node }: { node: WorkflowNode }) => {
  const productId = useWorkflowStore((state) =>
    readString(
      state.nodes.find((candidate) => candidate.data.type === "product-input")?.data.config
        .productId
    )
  );
  const mockup = useWorkflowStore((state) =>
    state.nodes.find((candidate) => candidate.data.type === "apply-mockup")
  );
  const { data: assets = [] } = useMockupAssets(productId);
  const { mutate: preview, isPending } = usePreviewVideoStoryboard(true);
  const previewRef = useRef(preview);
  previewRef.current = preview;
  const [board, setBoard] = useState<VideoStoryboard | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const sequence = useRef(0);
  const outputSeconds = board ? (board.outputDurationFrames ?? board.durationSeconds * 30) / 30 : 0;
  const aiClipSeconds = board?.aiShots?.reduce((sum, shot) => sum + shot.durationSeconds, 0);
  const approvedRevisionKey = useMemo(
    () =>
      assets
        .map(
          (asset) =>
            `${asset.id}:${asset.revision}:${asset.approvalStatus}:${asset.approvedRevision}`
        )
        .join("|"),
    [assets]
  );

  const requestPreview = useCallback(
    (requestId: number) => {
      const parsed = generateVideoConfigSchema.safeParse(
        previewConfig(node.data.config as GenerateVideoConfig)
      );
      if (!productId || !parsed.success) {
        setBoard(null);
        setPreviewError(
          parsed.success
            ? "Select a product to preview the storyboard."
            : (parsed.error.issues[0]?.message ?? "Check video settings.")
        );
        return;
      }

      setPreviewError(null);
      previewRef.current(
        {
          productId,
          config: parsed.data,
          mockupIds: readStringArray(mockup?.data.config.mockupIds),
          artworkGroupKey: readString(mockup?.data.config.artworkGroupKey),
        },
        {
          onSuccess: (result) => {
            if (sequence.current !== requestId) return;
            setBoard(result);
            setPreviewError(null);
          },
          onError: (error) => {
            if (sequence.current !== requestId) return;
            setBoard(null);
            setPreviewError(getErrorMessage(error));
          },
        }
      );
    },
    [
      mockup?.data.config.artworkGroupKey,
      mockup?.data.config.mockupIds,
      node.data.config,
      productId,
    ]
  );

  useEffect(() => {
    const requestId = ++sequence.current;
    const timer = window.setTimeout(() => requestPreview(requestId), 450);
    return () => window.clearTimeout(timer);
  }, [approvedRevisionKey, requestPreview]);

  const refresh = () => {
    const requestId = ++sequence.current;
    requestPreview(requestId);
  };
  const storyboardHasAiScenes =
    board?.scenes.some((scene) => scene.generationStrategy === "ai_shot") ?? false;

  return (
    <section
      className="bg-card overflow-hidden rounded-xl border"
      aria-labelledby="storyboard-preview-title"
    >
      <header className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0 space-y-1">
          <h3 id="storyboard-preview-title" className="text-base font-semibold">
            Storyboard preview
          </h3>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Review the source frame and order of every scene before running the workflow.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Refresh storyboard preview"
          title="Refresh preview"
          disabled={isPending || !productId}
          onClick={refresh}
        >
          <RefreshCw className={isPending ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
        </Button>
      </header>
      <div className="space-y-4 px-4 pb-4">
        {previewError && (
          <p
            className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            role="status"
          >
            {previewError}
          </p>
        )}
        {!board && isPending && (
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            aria-label="Loading storyboard preview"
            role="status"
          >
            {[0, 1, 2].map((item) => (
              <div key={item} className="bg-muted/60 aspect-[4/5] animate-pulse rounded-lg" />
            ))}
            <span className="sr-only">Loading storyboard preview</span>
          </div>
        )}
        {board && (
          <>
            <StoryboardPlayer board={board} assets={assets} />
            <p className="text-muted-foreground text-xs font-medium capitalize" aria-live="polite">
              {board.template.replaceAll("_", " ")} · {board.aspectRatio} · {board.width}×
              {board.height} · {board.durationSeconds}s · {board.scenes.length} scenes
            </p>
            <dl className="bg-muted/35 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg p-3 sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground text-[11px]">Scenes</dt>
                <dd className="mt-0.5 text-xs font-semibold">{board.scenes.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11px]">Format</dt>
                <dd className="mt-0.5 text-xs font-semibold">
                  {board.aspectRatio} · {board.width} × {board.height}
                </dd>
              </div>
              {aiClipSeconds != null && (
                <div>
                  <dt className="text-muted-foreground text-[11px]">AI footage</dt>
                  <dd className="mt-0.5 text-xs font-semibold tabular-nums">
                    {aiClipSeconds.toFixed(1)}s
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground text-[11px]">Final duration</dt>
                <dd className="mt-0.5 text-xs font-semibold tabular-nums">
                  {outputSeconds.toFixed(1)}s
                </dd>
              </div>
            </dl>
            {storyboardHasAiScenes && (
              <p className="text-muted-foreground text-xs leading-relaxed">
                Standard scenes show their camera framing here. AI scenes use their source frames
                until generated clips are ready.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
};
