"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { StoryboardPlayer } from "@/components/workflows/media/storyboard-player";
import { getErrorMessage } from "@/helpers/error-message";
import { readString, readStringArray } from "@/helpers/workflow-config";
import { usePreviewVideoStoryboard } from "@/hooks/mutations/use-preview-video-storyboard";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { usePreviewDesign } from "@/hooks/queries/use-preview-design";
import { useRunGroupId } from "@/hooks/queries/use-run-group";
import { useRunSceneVideos } from "@/hooks/queries/use-run-scene-videos";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
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
  const { t } = useTranslation("common");
  const inputProductId = useWorkflowStore((state) =>
    readString(
      state.nodes.find((candidate) => candidate.data.type === "product-input")?.data.config
        .productId
    )
  );
  const mockup = useWorkflowStore((state) =>
    state.nodes.find((candidate) => candidate.data.type === "apply-mockup")
  );
  // With one design's run of a batch video run open, the storyboard is that design's.
  const { run } = useWorkflowRuntime();
  // Only a run of the batch run open now is a design's run: a run of an earlier (cancelled) group is another
  // design, maybe made with older mock-ups, and must not take the editor over.
  const openGroupId = useRunGroupId();
  const designRun = run?.runGroupId && run.runGroupId === openGroupId ? run : null;
  const previewDesign = usePreviewDesign();
  const productId = designRun?.productId ?? previewDesign?.productId ?? inputProductId;
  const { data: assets = [] } = useMockupAssets(productId);
  // The AI clips the open run has made: an AI scene plays its clip, as in the full video editor, instead of its still start frame.
  const { data: sceneVideos = [] } = useRunSceneVideos(run?.id ?? null);
  const clips = useMemo(
    () =>
      Object.fromEntries(
        sceneVideos
          .filter((clip) => clip.status === "stored" && clip.previewUrl)
          .map((clip) => [clip.sceneOrder, clip.previewUrl as string])
      ) as Record<number, string>,
    [sceneVideos]
  );
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
            ? t("workflowMedia.storyboard.selectProduct")
            : (parsed.error.issues[0]?.message ?? t("workflowMedia.runStatus.checkVideoSettings"))
        );
        return;
      }

      setPreviewError(null);
      previewRef.current(
        {
          productId,
          config: parsed.data,
          // In a batch video run the storyboard is one design's: its scenes take that design's images on the server.
          mockupIds: designRun || previewDesign ? [] : readStringArray(mockup?.data.config.mockupIds),
          artworkGroupKey:
            designRun?.artworkGroupKey ?? previewDesign?.artworkGroupKey ?? readString(mockup?.data.config.artworkGroupKey),
          forDesign: Boolean(designRun || previewDesign),
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
      designRun,
      previewDesign,
      t,
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
            {t("workflowMedia.storyboard.title")}
          </h3>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {t("workflowMedia.storyboard.description")}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("workflowMedia.storyboard.refreshAria")}
          title={t("workflowMedia.storyboard.refresh")}
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
            aria-label={t("workflowMedia.storyboard.loading")}
            role="status"
          >
            {[0, 1, 2].map((item) => (
              <div key={item} className="bg-muted/60 aspect-[4/5] animate-pulse rounded-lg" />
            ))}
            <span className="sr-only">{t("workflowMedia.storyboard.loading")}</span>
          </div>
        )}
        {board && (
          <>
            <StoryboardPlayer
              board={board}
              assets={assets}
              config={node.data.config as GenerateVideoConfig}
              clips={clips}
            />
            <p className="text-muted-foreground text-xs font-medium capitalize" aria-live="polite">
              {board.template.replaceAll("_", " ")} · {board.aspectRatio} · {board.width}×
              {board.height} · {board.durationSeconds}s · {t("workflowMedia.storyboard.sceneCount", { count: board.scenes.length })}
            </p>
            <dl className="bg-muted/35 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg p-3 sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground text-[11px]">{t("workflowMedia.storyboard.scenes")}</dt>
                <dd className="mt-0.5 text-xs font-semibold">{board.scenes.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11px]">{t("workflowMedia.storyboard.format")}</dt>
                <dd className="mt-0.5 text-xs font-semibold">
                  {board.aspectRatio} · {board.width} × {board.height}
                </dd>
              </div>
              {aiClipSeconds != null && (
                <div>
                  <dt className="text-muted-foreground text-[11px]">{t("workflowMedia.storyboard.aiFootage")}</dt>
                  <dd className="mt-0.5 text-xs font-semibold tabular-nums">
                    {aiClipSeconds.toFixed(1)}s
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground text-[11px]">{t("workflowMedia.storyboard.finalDuration")}</dt>
                <dd className="mt-0.5 text-xs font-semibold tabular-nums">
                  {outputSeconds.toFixed(1)}s
                </dd>
              </div>
            </dl>
            {storyboardHasAiScenes && (
              <p className="text-muted-foreground text-xs leading-relaxed">
                {t("workflowMedia.storyboard.aiScenesNote")}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
};
