"use client";

import { type ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

import { NodeControl } from "@/components/workflows/nodes/node-control";
import { STOPPED, useGroupVideos, WITH_VIDEO } from "@/hooks/queries/use-group-videos";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import type { PromoVideo, RunGroupTarget } from "@/types/video-workflow";
import { cn } from "@/utils/cn";

/** Videos side by side on the node; the rest are a page away. */
export const VIDEOS_PER_PAGE = 4;
export const ASPECT: Record<string, string> = { portrait: "9 / 16", square: "1 / 1", landscape: "16 / 9" };

/** The page that holds the video at `index`. */
export const pageOf = (index: number) => Math.max(0, Math.floor(index / VIDEOS_PER_PAGE));

const chunk = <T,>(items: T[]) =>
  Array.from({ length: Math.ceil(items.length / VIDEOS_PER_PAGE) }, (_, page) =>
    items.slice(page * VIDEOS_PER_PAGE, page * VIDEOS_PER_PAGE + VIDEOS_PER_PAGE)
  );

/**
 * The videos of the batch run open on the canvas, on the Generate Video node: four side by side, the others a page
 * away with the arrows. A video still being made is a pulsing placeholder with how far it is; a finished one shows
 * its thumbnail. Choosing one opens that design's run, as the bar above the canvas does. Without such a run the node
 * shows `fallback` (the single run's preview).
 */
export const RunGroupVideoStrip = ({ fallback }: { fallback: ReactNode }) => {
  const { videos } = useGroupVideos();
  const { runId, selectRun } = useWorkflowRuntime();
  const [page, setPage] = useState(0);

  const targets = videos.map((item) => item.target);
  const latest = new Map<string, PromoVideo | undefined>(videos.map((item) => [item.target.runId!, item.video]));

  const pages = chunk(targets);
  const lastPage = Math.max(0, pages.length - 1);
  const shownPage = Math.min(page, lastPage);
  const activeIndex = targets.findIndex((target) => target.runId === runId);

  // The page follows the design whose run the canvas opens, from here or from the bar above the canvas.
  useEffect(() => {
    if (activeIndex >= 0) setPage(pageOf(activeIndex));
  }, [activeIndex]);

  if (targets.length === 0) return <>{fallback}</>;

  const done = targets.filter((target) => target.runStatus === "completed").length;
  const toReview = targets.filter((target) => target.runStatus === "waiting_for_review").length;

  return (
    <NodeControl className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <span className="text-wf-dim text-[10px] font-medium tracking-[0.08em] uppercase">
          Videos · {targets.length}
        </span>
        <span className="text-wf-faint text-[10px] tabular-nums">
          {done > 0 && `${done} done`}
          {done > 0 && toReview > 0 && " · "}
          {toReview > 0 && `${toReview} to review`}
          {pages.length > 1 && ` · ${shownPage + 1}/${pages.length}`}
        </span>
      </div>
      <div className="relative">
        <div className="overflow-hidden" role="group" aria-label={`Videos ${shownPage * VIDEOS_PER_PAGE + 1} to ${Math.min(targets.length, (shownPage + 1) * VIDEOS_PER_PAGE)} of ${targets.length}`}>
          <div
            className="flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ transform: `translate3d(-${shownPage * 100}%, 0, 0)` }}
          >
            {pages.map((items, index) => (
              <div
                key={index}
                className="grid w-full shrink-0 grid-cols-4 items-start gap-1.5"
                aria-hidden={index !== shownPage}
                // Off-page videos leave the tab order, so a keyboard never lands on a video it cannot see.
                inert={index !== shownPage}
              >
                {items.map((target) => (
                  <VideoTile
                    key={target.key}
                    target={target}
                    video={latest.get(target.runId!)}
                    active={target.runId === runId}
                    onOpen={() => selectRun(target.runId!)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        {pages.length > 1 && (
          <>
            <PageArrow direction="previous" disabled={shownPage === 0} onClick={() => setPage(shownPage - 1)} />
            <PageArrow direction="next" disabled={shownPage === lastPage} onClick={() => setPage(shownPage + 1)} />
          </>
        )}
      </div>
    </NodeControl>
  );
};

const PageArrow = ({ direction, disabled, onClick }: { direction: "previous" | "next"; disabled: boolean; onClick: () => void }) => (
  <button
    type="button"
    aria-label={direction === "next" ? "Next videos" : "Previous videos"}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "border-wf-line bg-wf-surface text-wf-dim hover:text-wf-ink absolute top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full border shadow-sm",
      "focus-visible:ring-wf-accent transition-opacity duration-200 focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none",
      direction === "next" ? "-right-2" : "-left-2",
      disabled && "pointer-events-none opacity-0"
    )}
  >
    {direction === "next" ? <ChevronRight className="size-3.5" aria-hidden="true" /> : <ChevronLeft className="size-3.5" aria-hidden="true" />}
  </button>
);

const VideoTile = ({ target, video, active, onOpen }: { target: RunGroupTarget; video?: PromoVideo; active: boolean; onOpen: () => void }) => {
  const status = target.runStatus ?? "";
  const aspect = ASPECT[target.config?.outputFormat ?? video?.outputFormat ?? "portrait"] ?? ASPECT.portrait;
  const stopped = STOPPED.has(status);
  const made = WITH_VIDEO.has(status);
  const thumbnail = made ? video?.thumbnailUrl : null;
  const progress = Math.max(0, Math.min(100, Math.round(target.progress)));
  const label = made
    ? status === "completed" ? "Done" : "Ready to review"
    : stopped
      ? status === "failed" ? "Failed" : status === "cancelled" ? "Stopped" : "Needs attention"
      : status === "queued" ? "Queued" : `Processing ${progress}%`;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? "true" : undefined}
      aria-label={`${target.productName} · ${target.designLabel}: ${label}`}
      title={`${target.productName} · ${target.designLabel} · ${label}`}
      className="group/tile bg-wf-muted relative block w-full overflow-hidden rounded-md text-left outline-none"
      style={{ aspectRatio: aspect }}
    >
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt=""
          fill
          sizes="72px"
          unoptimized
          className={cn(
            "object-cover transition-[filter] duration-200 motion-reduce:transition-none",
            !active && "brightness-[0.97] group-hover/tile:brightness-100"
          )}
        />
      ) : made ? (
        // Made, its thumbnail still loading: a quiet placeholder, not a progress that is already over.
        <span aria-hidden="true" className="bg-wf-line/60 absolute inset-0 animate-pulse motion-reduce:animate-none" />
      ) : stopped ? (
        <span className="text-wf-fail absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-1">
          <AlertTriangle className="size-3" aria-hidden="true" />
          <span className="text-[8px] leading-none font-medium">{label}</span>
        </span>
      ) : (
        <>
          {/* Only the backdrop pulses, so the number stays readable. */}
          <span aria-hidden="true" className="bg-wf-line/70 absolute inset-0 animate-pulse motion-reduce:animate-none" />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-1">
            <span className="text-wf-ink text-[11px] leading-none font-semibold tabular-nums">
              {status === "queued" ? "—" : `${progress}%`}
            </span>
            <span className="text-wf-faint text-[8px] leading-none">{status === "queued" ? "Queued" : "Processing"}</span>
          </span>
          <span aria-hidden="true" className="bg-wf-line absolute inset-x-0 bottom-0 h-0.5">
            <span className="bg-wf-accent block h-full transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
          </span>
        </>
      )}
      {/* The frame sits inside the tile, over the picture: the strip clips anything drawn outside it. The open
          video gets an accent rule with a light inner hairline, so it reads on a dark shirt as on a white one. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 rounded-md transition-shadow duration-200 ring-inset motion-reduce:transition-none",
          active
            ? "ring-wf-accent shadow-[inset_0_0_0_3px_rgba(255,255,255,0.6)] ring-2"
            : "group-hover/tile:ring-wf-accent/45 group-focus-visible/tile:ring-wf-accent ring-1 ring-black/[0.07] group-focus-visible/tile:ring-2"
        )}
      />
    </button>
  );
};
