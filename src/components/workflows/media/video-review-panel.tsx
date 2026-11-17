"use client";
import { useId, useState } from "react";
import {
  Check,
  Download,
  Film,
  History,
  RotateCcw,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PreloadedVideo } from "@/components/workflows/media/preloaded-video";
import { VideoPreviewFrame } from "@/components/workflows/media/video-preview-frame";
import { VideoSceneQualityReview } from "@/components/workflows/media/video-scene-quality-review";
import { VideoTimelineEditor } from "@/components/workflows/media/video-timeline-editor";
import { confirmAiShot } from "@/helpers/confirm-ai-shot";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { readString, readStringArray } from "@/helpers/workflow-config";
import { useMediaDownload } from "@/hooks/mutations/use-media-download";
import { usePreviewVideoStoryboard } from "@/hooks/mutations/use-preview-video-storyboard";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useRunSceneVideos } from "@/hooks/queries/use-run-scene-videos";
import { useRunVideos } from "@/hooks/queries/use-run-videos";
import { useWorkflowVideoRuns } from "@/hooks/queries/use-workflow-video-runs";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { generateVideoConfigSchema } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import type { GenerateVideoConfig, VideoRunSummary } from "@/types/video-workflow";

const formatRunDate = (value: string, language: string) =>
  `${new Intl.DateTimeFormat(language === "en" ? "en-GB" : language, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;

const VideoRunHistory = ({
  runs,
  selectedRunId,
  disabled,
  isPending,
  isError,
  workflowAvailable,
  onChange,
  onRetry,
}: {
  runs: VideoRunSummary[];
  selectedRunId: string | null;
  disabled: boolean;
  isPending: boolean;
  isError: boolean;
  workflowAvailable: boolean;
  onChange: (runId: string) => void;
  onRetry: () => void;
}) => {
  const { t, i18n } = useTranslation("common");
  const labelId = useId();
  const statusId = useId();
  const selectedValue = runs.some((run) => run.id === selectedRunId)
    ? (selectedRunId ?? undefined)
    : undefined;
  const placeholder = !workflowAvailable
    ? t("workflowMedia.videoReview.historyNotAvailable")
    : isPending
      ? t("workflowMedia.videoReview.loadingGenerated")
      : isError
        ? t("workflowMedia.videoReview.historyUnavailable")
        : runs.length === 0
          ? t("workflowMedia.videoReview.noSavedVideos")
          : t("workflowMedia.videoReview.choosePrevious");

  return (
    <div className="bg-muted/25 border-b px-4 py-3">
      <div className="flex flex-col gap-2 text-xs font-medium sm:flex-row sm:items-center sm:gap-3">
        <span id={labelId} className="flex shrink-0 items-center gap-2">
          <span className="bg-background grid size-6 shrink-0 place-items-center rounded-full border">
            <History className="text-muted-foreground size-3.5" aria-hidden="true" />
          </span>
          {t("workflowMedia.videoReview.videoHistory")}
        </span>
        <Select
          value={selectedValue}
          onValueChange={onChange}
          disabled={disabled || !workflowAvailable || isPending || isError || runs.length === 0}
        >
          <SelectTrigger className="bg-background w-full" aria-labelledby={labelId} aria-describedby={statusId}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {runs.map((run) => (
              <SelectItem key={run.id} value={run.id}>
                {formatRunDate(run.createdAt, i18n.language)} · {t("workflowMedia.videoReview.videoCount", { count: run.videoCount })} ·{" "}
                {t(`workflowMedia.runStatus.statuses.${run.status}`, { defaultValue: run.status.replaceAll("_", " ") })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div
        id={statusId}
        className="text-muted-foreground mt-2 flex min-h-4 items-center justify-between gap-3 text-[11px] leading-relaxed font-normal"
        role={isError ? "alert" : "status"}
        aria-live="polite"
      >
        {!workflowAvailable ? (
          <span>{t("workflowMedia.videoReview.historyAfterCreate")}</span>
        ) : isPending ? (
          <span>{t("workflowMedia.videoReview.checkingCompleted")}</span>
        ) : isError ? (
          <>
            <span>
              {t("workflowMedia.videoReview.historyLoadError")}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs"
              onClick={onRetry}
            >
              {t("workflowMedia.videoReview.tryAgain")}
            </Button>
          </>
        ) : runs.length === 0 ? (
          <span>{t("workflowMedia.videoReview.noCompleted")}</span>
        ) : (
          <span>{t("workflowMedia.videoReview.selectPrevious")}</span>
        )}
      </div>
    </div>
  );
};

export const VideoReviewPanel = () => {
  const { t } = useTranslation("common");
  const { run, runId, selectRun } = useWorkflowRuntime();
  const { data: videos, isPending } = useRunVideos(runId);
  const { data: sceneVideos = [] } = useRunSceneVideos(runId);
  const { mutate: action, isPending: isActing } = useWorkflowRunAction();
  const { mutateAsync: previewStoryboard, isPending: isPreviewing } = usePreviewVideoStoryboard();
  const { mutate: download, isPending: isDownloading } = useMediaDownload();
  const [viewedId, setViewedId] = useState<string | null>(null);
  const [editedTimelineConfigs, setEditedTimelineConfigs] = useState<
    Record<string, GenerateVideoConfig>
  >({});
  const video = videos?.find((v) => v.id === viewedId) ?? videos?.[0];
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const {
    data: videoRuns = [],
    isPending: isHistoryPending,
    isError: isHistoryError,
    refetch: refetchHistory,
  } = useWorkflowVideoRuns(workflowId);
  const history = (
    <VideoRunHistory
      runs={videoRuns}
      selectedRunId={runId}
      disabled={run?.status === "running"}
      isPending={Boolean(workflowId) && isHistoryPending}
      isError={Boolean(workflowId) && isHistoryError}
      workflowAvailable={Boolean(workflowId)}
      onRetry={() => {
        void refetchHistory();
      }}
      onChange={(selectedRunId) => {
        setViewedId(null);
        selectRun(selectedRunId);
      }}
    />
  );
  const generate = useWorkflowStore((state) =>
    state.nodes.find((n) => n.data.type === "generate-video")
  );
  const mockup = useWorkflowStore((state) =>
    state.nodes.find((n) => n.data.type === "apply-mockup")
  );
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const { data: editAssets = [] } = useMockupAssets(run?.productId ?? "");
  const timelineConfig =
    (video ? editedTimelineConfigs[video.id] : undefined) ??
    video?.config ??
    (generate?.data.config as GenerateVideoConfig | undefined);
  const candidateId = run?.nodes.find((n) => n.nodeType === "review-video")?.output.videoId;
  const canReview =
    run?.status === "waiting_for_review" &&
    video?.id === candidateId &&
    video?.status === "completed";
  const rerender = async () => {
    if (!run || !timelineConfig) return;
    const parsed = generateVideoConfigSchema.safeParse(timelineConfig);
    if (!parsed.success) {
      showToast("warning", parsed.error.issues[0]?.message ?? t("workflowMedia.runStatus.checkVideoSettings"));
      return;
    }
    try {
      const storyboard = await previewStoryboard({
        productId: run.productId,
        config: parsed.data,
        mockupIds: video?.mockupIds ?? readStringArray(mockup?.data.config.mockupIds),
        artworkGroupKey: video?.artworkGroupKey ?? readString(mockup?.data.config.artworkGroupKey),
      });
      const token = await confirmAiShot(run.id, parsed.data);
      if (token === null) return;
      action({
        runId: run.id,
        expectedRevision: run.revision,
        action: "rerender",
        config: parsed.data,
        expectedStoryboardFingerprint: storyboard.fingerprint,
        aiShotQuoteToken: token,
      });
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  };
  if (!runId)
    return (
      <section className="bg-card rounded-xl border p-4" aria-labelledby="final-video-title">
        <h3 id="final-video-title" className="text-base font-semibold">
          {t("workflowMedia.videoReview.finalVideo")}
        </h3>
        <div className="-mx-4 mt-3">{history}</div>
        <div className="bg-muted/35 text-muted-foreground mt-3 flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg px-4 text-center">
          <Film className="size-5" aria-hidden="true" />
          <p className="text-xs leading-relaxed">
            {t("workflowMedia.videoReview.runToGenerate")}
          </p>
        </div>
      </section>
    );
  if (isPending)
    return (
      <section
        className="bg-card overflow-hidden rounded-xl border"
        aria-labelledby="final-video-title"
      >
        <h3 id="final-video-title" className="p-4 text-base font-semibold">
          {t("workflowMedia.videoReview.finalVideo")}
        </h3>
        {history}
        <div className="p-4">
          <SectionLoading label={t("workflowMedia.videoReview.loadingVersions")} />
        </div>
      </section>
    );
  if (!video)
    return (
      <section
        className="bg-card overflow-hidden rounded-xl border"
        aria-labelledby="final-video-title"
      >
        <h3 id="final-video-title" className="p-4 text-base font-semibold">
          {t("workflowMedia.videoReview.finalVideo")}
        </h3>
        {history}
        <p className="text-muted-foreground p-4 text-xs">
          {t("workflowMedia.videoReview.noJoinedVideo")}
        </p>
      </section>
    );
  return (
    <section
      className="bg-card overflow-hidden rounded-xl border"
      aria-labelledby="final-video-title"
    >
      <header className="flex flex-wrap items-end justify-between gap-3 p-4">
        <div className="space-y-1">
          <h3 id="final-video-title" className="text-base font-semibold">
            {t("workflowMedia.videoReview.finalVideo")}
          </h3>
          <p className="text-muted-foreground text-xs">
            {t("workflowMedia.videoReview.reviewDescription")}
          </p>
        </div>
        <div className="w-full min-w-0 min-[420px]:max-w-52">
          <Select value={video.id} onValueChange={setViewedId}>
            <SelectTrigger className="w-full" aria-label={t("workflowMedia.videoReview.videoVersion")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {videos?.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {t("workflowMedia.videoReview.versionOption", { version: v.version, status: t(`workflowMedia.approvalStatuses.${v.approvalStatus}`, { defaultValue: v.approvalStatus }) })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>
      {history}
      <div className="space-y-4 px-4 pb-4">
        {video.previewUrl ? (
          <VideoPreviewFrame width={video.width} height={video.height} maxHeightRem={34}>
            <PreloadedVideo
              key={video.id}
              src={video.previewUrl}
              poster={video.thumbnailUrl ?? undefined}
              label={t("workflowMedia.videoReview.finalVideoVersion", { version: video.version })}
            />
          </VideoPreviewFrame>
        ) : (
          <div className="bg-muted/35 text-muted-foreground flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg px-4 text-center">
            <Film className="size-5" aria-hidden="true" />
            <p className="text-xs leading-relaxed">{t("workflowMedia.videoReview.preparing")}</p>
          </div>
        )}
        <dl className="bg-muted/35 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg p-3 sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground text-[11px]">{t("workflowMedia.videoReview.version")}</dt>
            <dd className="mt-0.5 text-xs font-semibold">{video.version}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[11px]">{t("workflowMedia.storyboard.format")}</dt>
            <dd className="mt-0.5 text-xs font-semibold">
              {video.aspectRatio} · {video.width} × {video.height}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[11px]">{t("workflowMedia.videoReview.review")}</dt>
            <dd className="mt-0.5 text-xs font-semibold">{t("workflowMedia.videoReview.revision", { revision: video.reviewRevision })}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[11px]">{t("workflowMedia.videoReview.qualityCheck")}</dt>
            <dd className="mt-0.5 text-xs font-semibold">
              {(typeof video.qa.technical === "object" && video.qa.technical !== null
                ? (video.qa.technical as Record<string, unknown>).fullDecode
                : video.qa.fullDecode) === true ? t("workflowMedia.videoReview.passed") : t("workflowMedia.videoReview.pending")}
            </dd>
          </div>
        </dl>
        <VideoSceneQualityReview runId={runId} video={video} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="icon-sm"
            aria-label={t("workflowMedia.videoReview.approveVideo")}
            title={t("workflowMedia.videoReview.approveVideo")}
            disabled={!canReview || isActing || video.approvalStatus === "approved"}
            onClick={() =>
              run &&
              action({
                runId: run.id,
                expectedRevision: run.revision,
                action: "approve_video",
                videoId: video.id,
                reviewRevision: video.reviewRevision,
              })
            }
          >
            <Check aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={t("workflowMedia.videoReview.rejectVideo")}
            title={t("workflowMedia.videoReview.rejectVideo")}
            disabled={!canReview || isActing || video.approvalStatus === "rejected"}
            onClick={() =>
              run &&
              action({
                runId: run.id,
                expectedRevision: run.revision,
                action: "reject_video",
                videoId: video.id,
                reviewRevision: video.reviewRevision,
              })
            }
          >
            <X aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={t("workflowMedia.videoReview.downloadMp4")}
            title={t("workflowMedia.videoReview.downloadMp4")}
            disabled={isDownloading || !video.previewUrl}
            onClick={() =>
              download(
                { id: video.id, zip: false },
                { onSuccess: (url) => window.location.assign(url) }
              )
            }
          >
            <Download aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={isPreviewing ? t("workflowMedia.videoReview.checkingStoryboard") : t("workflowMedia.videoReview.rerender")}
            title={isPreviewing ? t("workflowMedia.videoReview.checkingStoryboardDots") : t("workflowMedia.videoReview.rerender")}
            disabled={!canReview || isActing || isPreviewing}
            onClick={rerender}
          >
            <RotateCcw aria-hidden="true" />
          </Button>
          {generate && timelineConfig && (
            <VideoTimelineEditor
              config={timelineConfig}
              assets={editAssets}
              sceneVideos={sceneVideos}
              disabled={isActing}
              onSave={(next) => {
                if (video) {
                  setEditedTimelineConfigs((current) => ({ ...current, [video.id]: next }));
                }
                updateNodeConfig(generate.id, next);
              }}
            />
          )}
        </div>
        {!canReview && (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {t("workflowMedia.videoReview.onlyCurrent")}
          </p>
        )}
      </div>
    </section>
  );
};
