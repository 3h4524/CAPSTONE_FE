"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertTriangle, ArrowRight, Check, X } from "lucide-react";

import { runGroupKeys } from "@/api/run-groups";
import { getWorkflowRun } from "@/api/video-workflow";
import { Button } from "@/components/ui/button";
import { ScrollStrip } from "@/components/workflows/run/mockup-strip";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { type GroupVideo, type GroupVideoState, groupVideoState, useGroupVideos } from "@/hooks/queries/use-group-videos";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { cn } from "@/utils/cn";

type Filter = "all" | "review" | "approved";

// The same palette as the cards of Mockup Approval: a decision still to make is slate, approved emerald, a failure rose;
// a video being made takes the navy of the product.
const STATE: Record<GroupVideoState, { label: string; pill: string; bar: string }> = {
  review: { label: "To review", pill: "bg-ink-100 text-ink-600", bar: "bg-ink-400" },
  approved: { label: "Approved", pill: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" },
  processing: { label: "Rendering", pill: "bg-primary/10 text-primary", bar: "bg-primary" },
  queued: { label: "Queued", pill: "bg-ink-100 text-ink-600", bar: "bg-ink-300" },
  stopped: { label: "Stopped", pill: "bg-rose-100 text-rose-700", bar: "bg-rose-500" },
};
/** The order the summary bar draws its parts in: settled work first, as it reads left to right. */
const BAR_ORDER: GroupVideoState[] = ["approved", "review", "processing", "queued", "stopped"];

const stateLabel = (item: GroupVideo, state: GroupVideoState) =>
  state === "processing"
    ? `Rendering ${Math.round(item.target.progress)}%`
    : state === "stopped" && item.target.runStatus === "failed"
      ? "Failed"
      : STATE[state].label;

/**
 * Review Video while a batch video run is open: every design's video at once, how far the review is, and the one being
 * reviewed below. Choosing a video opens its run, so the player and the approve / reject controls under the list are
 * that video's. "Review next" steps through the ones still waiting.
 */
export const GroupVideoList = () => {
  const { group, videos } = useGroupVideos();
  const { runId, selectRun } = useWorkflowRuntime();
  const [filter, setFilter] = useState<Filter>("all");
  if (videos.length === 0) return null;

  const states = videos.map((item) => groupVideoState(item.target));
  const count = (state: GroupVideoState) => states.filter((value) => value === state).length;
  const approved = count("approved");
  const toReview = count("review");
  const shown = videos.filter((_, index) =>
    filter === "all" ? true : filter === "review" ? states[index] === "review" : states[index] === "approved"
  );
  const currentIndex = videos.findIndex((item) => item.target.runId === runId);
  // The next one waiting after the open video, wrapping round, so repeated presses walk through them all.
  const nextToReview = [...videos.slice(currentIndex + 1), ...videos.slice(0, currentIndex + 1)].find(
    (item) => groupVideoState(item.target) === "review" && item.target.runId !== runId
  );

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: videos.length },
    { value: "review", label: "To review", count: toReview },
    { value: "approved", label: "Approved", count: approved },
  ];

  return (
    <section className="bg-card overflow-hidden rounded-xl border" aria-labelledby="group-videos-title">
      <header className="space-y-3 p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="group-videos-title" className="text-base font-semibold">
              Videos
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
              {approved} of {videos.length} approved
              {toReview > 0 && ` · ${toReview} waiting for you`}
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
              Review next
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
        {/* One part per state, as wide as its share: the review at a glance. Described in words just above. */}
        <div className="bg-muted flex h-1.5 gap-px overflow-hidden rounded-full" aria-hidden="true">
          {BAR_ORDER.map((state) =>
            count(state) > 0 ? (
              <span
                key={state}
                className={cn("h-full transition-[width] duration-500 motion-reduce:transition-none", STATE[state].bar)}
                style={{ width: `${(count(state) / videos.length) * 100}%` }}
              />
            ) : null
          )}
        </div>
        <div className="flex gap-1" role="group" aria-label="Show videos">
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
          {filter === "review" ? "Nothing is waiting for review." : "No video is approved yet."}
        </p>
      ) : (
        <div className="border-t pt-3">
          <ScrollStrip label="Videos of this run" itemCount={shown.length}>
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
  const { target, video } = item;
  const client = useAppQueryClient();
  const { mutate: act } = useWorkflowRunAction();
  const [isDeciding, setIsDeciding] = useState(false);
  const state = groupVideoState(target);
  const label = stateLabel(item, state);
  const progress = Math.max(0, Math.min(100, Math.round(target.progress)));
  const thumbnail = state === "review" || state === "approved" ? video?.thumbnailUrl : null;
  const approved = state === "approved";
  const canDecide = state === "review" && Boolean(video) && !isDeciding;
  const refreshGroup = () => {
    if (groupId) void client.invalidateQueries({ queryKey: runGroupKeys.detail(groupId) });
  };

  const decide = async (approve: boolean) => {
    if (!video || !target.runId) return;
    setIsDeciding(true);
    try {
      // The run's revision moves with every change, so it is read fresh rather than taken from an older list.
      const run = await getWorkflowRun(target.runId);
      const candidateId = run.nodes.find((node) => node.nodeType === "review-video")?.output.videoId;
      if (run.status !== "waiting_for_review" || candidateId !== video.id) {
        showToast("warning", "This video is no longer waiting for your review.");
        refreshGroup();
        setIsDeciding(false);
        return;
      }
      act(
        {
          runId: run.id,
          expectedRevision: run.revision,
          action: approve ? "approve_video" : "reject_video",
          videoId: video.id,
          reviewRevision: video.reviewRevision,
        },
        { onSuccess: refreshGroup, onSettled: () => setIsDeciding(false) }
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
          state === "stopped" && "border-rose-300",
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
              <Image src={thumbnail} alt="" fill sizes="176px" unoptimized className="object-contain p-1" />
            ) : state === "stopped" ? (
              <span className="absolute inset-0 grid place-items-center text-rose-600">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </span>
            ) : (
              <>
                <span aria-hidden="true" className="bg-muted-foreground/15 absolute inset-0 animate-pulse motion-reduce:animate-none" />
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
              {video && ` · Version ${video.version}`}
              {state === "stopped" && target.runError && ` · ${target.runError}`}
            </span>
          </span>
        </button>
        {/* Below the picture on every card, so the status and the buttons sit on the same line. */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 p-2">
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap tabular-nums", STATE[state].pill)}>
            {label}
          </span>
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant={approved ? "default" : "outline"}
              size="icon-sm"
              aria-label="Approve video"
              aria-pressed={approved}
              title="Approve video"
              disabled={!canDecide}
              onClick={() => void decide(true)}
              className={approved ? "disabled:opacity-100" : undefined}
            >
              <Check aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Reject video"
              title="Reject video"
              disabled={!canDecide}
              onClick={() => void decide(false)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
};
