"use client";

import { useState } from "react";
import Image from "next/image";
import type { TFunction } from "i18next";
import { AlertTriangle, ArrowRight, Check, Download, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { runGroupKeys } from "@/api/run-groups";
import { getWorkflowRun, listRunVideos, videoWorkflowKeys } from "@/api/video-workflow";
import { Button } from "@/components/ui/button";
import { ScrollStrip } from "@/components/workflows/run/mockup-strip";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { videoPosterUrl } from "@/helpers/video-poster";
import { useMediaDownload } from "@/hooks/mutations/use-media-download";
import { useContinueRunGroupReview } from "@/hooks/mutations/use-run-group-actions";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import {
  awaitsContinue,
  generateProgressOf,
  type GroupVideo,
  type GroupVideoDecision,
  groupVideoDecision,
  useGroupVideos,
  videoStatusOf,
} from "@/hooks/queries/use-group-videos";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { cn } from "@/utils/cn";

type Filter = "all" | "review" | "approved" | "rejected";

// The same palette as the cards of Mockup Approval: a decision still to make is slate, approved emerald, a failure rose;
// a video being made takes the navy of the product.
const STATE: Record<GroupVideoDecision, { labelKey: string; pill: string; bar: string }> = {
  review: {
    labelKey: "workflowEditor.groupVideos.states.review",
    pill: "bg-ink-100 text-ink-600",
    bar: "bg-ink-400",
  },
  approved: {
    labelKey: "workflowEditor.groupVideos.states.approved",
    pill: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
  },
  processing: {
    labelKey: "workflowEditor.groupVideos.states.processing",
    pill: "bg-primary/10 text-primary",
    bar: "bg-primary",
  },
  queued: {
    labelKey: "workflowEditor.groupVideos.states.queued",
    pill: "bg-ink-100 text-ink-600",
    bar: "bg-ink-300",
  },
  rejected: {
    labelKey: "workflowEditor.groupVideos.states.rejected",
    pill: "bg-rose-100 text-rose-700",
    bar: "bg-rose-400",
  },
  stopped: {
    labelKey: "workflowEditor.groupVideos.states.stopped",
    pill: "bg-rose-100 text-rose-700",
    bar: "bg-rose-500",
  },
};
/** The order the summary bar draws its parts in: settled work first, as it reads left to right. */
const BAR_ORDER: GroupVideoDecision[] = ["approved", "rejected", "review", "processing", "queued", "stopped"];

const stateLabel = (item: GroupVideo, state: GroupVideoDecision, t: TFunction) =>
  state === "processing"
    ? t("workflowEditor.groupVideos.renderingProgress", {
        progress: Math.round(generateProgressOf(item.target)),
      })
    : state === "stopped" && videoStatusOf(item.target) === "failed"
      ? t("workflowEditor.groupVideos.failed")
      : t(STATE[state].labelKey);

/**
 * Review Video while a batch video run is open: every design's video at once, how far the review is, and the one being
 * reviewed below. Choosing a video opens its run, so the player and the approve / reject controls under the list are
 * that video's. "Review next" steps through the ones still waiting. As at Mockup Approval, approving or rejecting only
 * records the decision; Continue then goes on with every video at once: an approved one is exported with its product,
 * a rejected one is left out and its product exported without it.
 */
export const GroupVideoList = () => {
  const { t } = useTranslation("common");
  const { group, videos } = useGroupVideos();
  const { runId, selectRun } = useWorkflowRuntime();
  const [filter, setFilter] = useState<Filter>("all");
  const { mutate: continueReview, isPending: isContinuing } = useContinueRunGroupReview();
  const client = useAppQueryClient();
  if (videos.length === 0) return null;

  const states = videos.map(groupVideoDecision);
  const count = (state: GroupVideoDecision) => states.filter((value) => value === state).length;
  const approved = count("approved");
  const rejected = count("rejected");
  const toReview = count("review");
  const shown = videos.filter((_, index) => filter === "all" || states[index] === filter);
  const currentIndex = videos.findIndex((item) => item.target.runId === runId);
  // The next one waiting after the open video, wrapping round, so repeated presses walk through them all.
  const nextToReview = [
    ...videos.slice(currentIndex + 1),
    ...videos.slice(0, currentIndex + 1),
  ].find((item) => groupVideoDecision(item) === "review" && item.target.runId !== runId);
  // Continue is offered while videos wait at Review Video, and goes once each is decided and none is still being made.
  const awaiting = videos.filter((item) => awaitsContinue(item.target)).length;
  const stillMaking = count("processing") + count("queued");
  const canContinue = Boolean(group) && awaiting > 0 && toReview === 0 && stillMaking === 0 && !isContinuing;
  const continueHint =
    stillMaking > 0
      ? t("workflowEditor.groupVideos.continueAfterRender")
      : toReview > 0
        ? t("workflowEditor.groupVideos.continueAfterDecisions")
        : rejected > 0
          ? t("workflowEditor.groupVideos.continueRejected", { count: rejected })
          : t("workflowEditor.groupVideos.continueApproved");
  const goOn = () =>
    group &&
    continueReview(
      { groupId: group.id, expectedRevision: group.revision },
      {
        onSuccess: () => {
          showToast("success", t("workflowEditor.groupVideos.continued"));
          for (const item of videos)
            if (item.target.runId) void client.invalidateQueries({ queryKey: videoWorkflowKeys.videos(item.target.runId) });
        },
      }
    );

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: t("workflowEditor.groupVideos.filterAll"), count: videos.length },
    { value: "review", label: t("workflowEditor.groupVideos.states.review"), count: toReview },
    { value: "approved", label: t("workflowEditor.groupVideos.states.approved"), count: approved },
    { value: "rejected", label: t("workflowEditor.groupVideos.states.rejected"), count: rejected },
  ];

  return (
    <section
      className="bg-card overflow-hidden rounded-xl border"
      aria-labelledby="group-videos-title"
    >
      <header className="space-y-3 p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="group-videos-title" className="text-base font-semibold">
              {t("workflowEditor.groupVideos.title")}
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
              {t("workflowEditor.groupVideos.approvedOf", { approved, total: videos.length })}
              {rejected > 0 &&
                ` · ${t("workflowEditor.groupVideos.rejectedCount", { count: rejected })}`}
              {toReview > 0 &&
                ` · ${t("workflowEditor.groupVideos.waitingForYou", { count: toReview })}`}
            </p>
          </div>
          {nextToReview && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 gap-1.5 text-xs hover:translate-y-0"
              onClick={() => selectRun(nextToReview.target.runId!)}
            >
              {t("workflowEditor.groupVideos.reviewNext")}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
        {awaiting > 0 && (
          <div className="bg-muted/60 flex items-center justify-between gap-3 rounded-lg px-3 py-2">
            <p className="text-muted-foreground text-xs leading-relaxed">{continueHint}</p>
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 gap-1.5 text-xs hover:translate-y-0"
              disabled={!canContinue}
              onClick={goOn}
            >
              {isContinuing && (
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              )}
              {t("workflowEditor.groupVideos.continue")}
            </Button>
          </div>
        )}
        {/* One part per state, as wide as its share: the review at a glance. Described in words just above. */}
        <div className="bg-muted flex h-1.5 gap-px overflow-hidden rounded-full" aria-hidden="true">
          {BAR_ORDER.map((state) =>
            count(state) > 0 ? (
              <span
                key={state}
                className={cn(
                  "h-full transition-[width] duration-500 motion-reduce:transition-none",
                  STATE[state].bar
                )}
                style={{ width: `${(count(state) / videos.length) * 100}%` }}
              />
            ) : null
          )}
        </div>
        <div
          className="flex gap-1"
          role="group"
          aria-label={t("workflowEditor.groupVideos.showVideos")}
        >
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                "h-7 rounded-full px-2.5 text-xs font-medium transition-colors motion-reduce:transition-none",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                filter === option.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {option.label}
              <span className="ml-1 tabular-nums opacity-70">{option.count}</span>
            </button>
          ))}
        </div>
      </header>
      {shown.length === 0 ? (
        <p className="text-muted-foreground border-t px-4 py-6 text-center text-xs">
          {filter === "review"
            ? t("workflowEditor.groupVideos.nothingWaiting")
            : filter === "rejected"
              ? t("workflowEditor.groupVideos.noneRejected")
              : t("workflowEditor.groupVideos.noneApproved")}
        </p>
      ) : (
        <div className="border-t pt-3">
          <ScrollStrip label={t("workflowEditor.groupVideos.stripLabel")} itemCount={shown.length}>
            {shown.map((item) => (
              <VideoCard
                key={item.target.key}
                item={item}
                groupId={group?.id ?? null}
                active={item.target.runId === runId}
                onOpen={() => selectRun(item.target.runId!)}
              />
            ))}
          </ScrollStrip>
        </div>
      )}
    </section>
  );
};

// One video as a card of the strip, laid out like a mock-up card of Mockup Approval: the picture, who it is, then its
// status with approve / reject. The picture and name open that video's run; the open one is outlined in the primary
// colour. Approving or rejecting here is what the review panel's buttons do, for a video that waits for a decision.
const VideoCard = ({
  item,
  active,
  groupId,
  onOpen,
}: {
  item: GroupVideo;
  active: boolean;
  groupId: string | null;
  onOpen: () => void;
}) => {
  const { t } = useTranslation("common");
  const { target, video } = item;
  const client = useAppQueryClient();
  const { mutate: act } = useWorkflowRunAction();
  const { mutate: download, isPending: isDownloading } = useMediaDownload();
  const [isDeciding, setIsDeciding] = useState(false);
  const state = groupVideoDecision(item);
  const label = stateLabel(item, state, t);
  const progress = Math.max(0, Math.min(100, Math.round(generateProgressOf(target))));
  const made = state === "review" || state === "approved" || state === "rejected";
  const thumbnail = made ? videoPosterUrl(video) : null;
  const approved = state === "approved";
  const rejected = state === "rejected";
  // Until Continue the decision can be made or changed; after it, it is final.
  const open = awaitsContinue(target) && Boolean(video) && !isDeciding;
  const canApprove = open && !approved;
  const canReject = open && !rejected;
  // A finished video can be saved whatever its review says: the MP4 the review panel downloads.
  const canDownload = Boolean(video?.previewUrl) && made && !isDownloading;
  const refresh = () => {
    if (groupId) void client.invalidateQueries({ queryKey: runGroupKeys.detail(groupId) });
    // The video's approval and review revision change with every decision.
    if (target.runId) void client.invalidateQueries({ queryKey: videoWorkflowKeys.videos(target.runId) });
  };

  const decide = async (approve: boolean) => {
    if (!video || !target.runId) return;
    setIsDeciding(true);
    try {
      // The run's revision and the video's review revision move with every decision, so both are read fresh rather
      // than taken from an older list.
      const [run, runVideos] = await Promise.all([getWorkflowRun(target.runId), listRunVideos(target.runId)]);
      const review = run.nodes.find((node) => node.nodeType === "review-video");
      const current = runVideos.find((item) => item.id === video.id);
      if (run.status !== "waiting_for_review" || review?.output.videoId !== video.id || !current) {
        showToast("warning", t("workflowEditor.groupVideos.noLongerWaiting"));
        refresh();
        setIsDeciding(false);
        return;
      }
      act(
        {
          runId: run.id,
          expectedRevision: run.revision,
          action: approve ? "approve_video" : "reject_video",
          videoId: video.id,
          reviewRevision: current.reviewRevision,
        },
        { onSettled: () => { refresh(); setIsDeciding(false); } }
      );
    } catch (error) {
      showToast("error", getErrorMessage(error));
      setIsDeciding(false);
    }
  };

  return (
    <li className="w-44 shrink-0 snap-start">
      <div
        className={cn(
          "bg-card flex h-full flex-col overflow-hidden rounded-lg border transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none",
          state === "approved" && "border-emerald-300",
          (state === "stopped" || rejected) && "border-rose-300",
          active && "border-primary ring-primary ring-1"
        )}
      >
        <button
          type="button"
          onClick={onOpen}
          aria-current={active ? "true" : undefined}
          className="focus-visible:ring-ring/50 flex flex-1 flex-col text-left focus-visible:ring-[3px] focus-visible:outline-none focus-visible:ring-inset"
        >
          <span className="bg-muted relative block aspect-square w-full">
            {thumbnail ? (
              <Image
                src={thumbnail}
                alt=""
                fill
                sizes="176px"
                unoptimized
                className="object-contain p-1"
              />
            ) : state === "stopped" ? (
              <span className="absolute inset-0 grid place-items-center text-rose-600">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </span>
            ) : (
              <>
                <span
                  aria-hidden="true"
                  className="bg-muted-foreground/15 absolute inset-0 animate-pulse motion-reduce:animate-none"
                />
                {state === "processing" && (
                  <span className="text-foreground/80 absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums">
                    {progress}%
                  </span>
                )}
              </>
            )}
          </span>
          <span className="block min-w-0 p-2 pb-0">
            <span className="block truncate text-xs font-medium" title={target.productName}>
              {target.productName}
            </span>
            <span className="text-muted-foreground block truncate text-xs">
              {target.designLabel}
              {video && ` · ${t("workflowEditor.groupVideos.version", { version: video.version })}`}
              {state === "stopped" && target.runError && ` · ${target.runError}`}
            </span>
          </span>
        </button>
        {/* Below the picture on every card, so the status and the buttons sit on the same line. */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 p-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap tabular-nums",
              STATE[state].pill
            )}
          >
            {label}
          </span>
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant={approved ? "default" : "outline"}
              size="icon-sm"
              aria-label={t("workflowEditor.groupVideos.approveVideo")}
              aria-pressed={approved}
              title={t("workflowEditor.groupVideos.approveVideo")}
              disabled={!canApprove}
              onClick={() => void decide(true)}
              className={approved ? "disabled:opacity-100" : undefined}
            >
              <Check aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant={rejected ? "destructive" : "outline"}
              size="icon-sm"
              aria-label={t("workflowEditor.groupVideos.rejectVideo")}
              aria-pressed={rejected}
              title={t("workflowEditor.groupVideos.rejectVideo")}
              disabled={!canReject}
              onClick={() => void decide(false)}
              className={rejected ? "disabled:opacity-100" : undefined}
            >
              <X aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={t("workflowEditor.groupVideos.downloadVideo")}
              title={t("workflowEditor.groupVideos.downloadMp4")}
              disabled={!canDownload}
              onClick={() =>
                video &&
                download(
                  { id: video.id, zip: false },
                  // A failed request is reported by the mutation hook itself.
                  { onSuccess: (url) => window.location.assign(url) }
                )
              }
            >
              <Download aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
};
