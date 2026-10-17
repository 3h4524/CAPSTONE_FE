"use client";

import { useState } from "react";
import { Film, Play, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AiSceneVideo } from "@/types/video-workflow";

const STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  submitting: "Starting",
  polling: "Generating",
  ready: "Preparing preview",
  stored: "Ready",
  failed: "Needs attention",
};

const ACTIVE_STATUSES = new Set(["pending", "submitting", "polling", "ready"]);

export const SceneVideoResult = ({ sceneNumber, clip, runStarted, waitingForGeneration, canRegenerate, isRegenerating, onRegenerate }: {
  sceneNumber: number;
  clip?: AiSceneVideo;
  runStarted: boolean;
  waitingForGeneration: boolean;
  canRegenerate: boolean;
  isRegenerating: boolean;
  onRegenerate: () => void;
}) => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const isGenerating = isRegenerating || Boolean(clip && ACTIVE_STATUSES.has(clip.status)) || waitingForGeneration;
  const status = isRegenerating ? "Regenerating" : clip ? STATUS_LABELS[clip.status] ?? clip.status : runStarted ? "Waiting" : "Not generated";
  const statusClass = isGenerating
    ? "bg-muted text-muted-foreground"
    : clip?.status === "stored"
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
    : clip?.status === "failed"
      ? "bg-destructive/10 text-destructive"
      : "bg-muted text-muted-foreground";

  return <section className="bg-muted/35 space-y-3 rounded-md border p-3" aria-label={`Scene ${sceneNumber} generated video`}>
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold">Scene video</p>
        <p className="text-muted-foreground mt-0.5 text-xs">The finished clip appears here as soon as this scene completes.</p>
      </div>
      <span role="status" aria-atomic="true" className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass}`}>{status}</span>
    </div>

    <div className="grid items-center gap-3 min-[440px]:grid-cols-[10rem_minmax(0,1fr)]">
      {clip?.previewUrl && !isRegenerating
        ? <button type="button" onClick={() => setIsVideoOpen(true)} aria-label={`Open video preview for scene ${sceneNumber}`}
          className="group focus-visible:outline-primary relative mx-auto block aspect-[9/16] w-40 overflow-hidden rounded-md bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          <video muted playsInline preload="metadata" className="size-full object-contain" aria-hidden="true">
            <source src={clip.previewUrl} type="video/mp4" />
          </video>
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-black/15 transition-colors group-hover:bg-black/30 group-focus-visible:bg-black/30">
            <span className="grid size-12 place-items-center rounded-full bg-black/70 text-white shadow-lg transition-transform group-hover:scale-105">
              <Play className="ml-0.5 size-5 fill-current" />
            </span>
          </span>
        </button>
        : isGenerating
          ? <div aria-hidden="true" className="bg-muted-foreground/10 mx-auto aspect-[9/16] w-40 animate-pulse rounded-md" />
          : <div className="bg-background/70 text-muted-foreground mx-auto flex aspect-[9/16] w-40 flex-col items-center justify-center gap-2 rounded-md">
            <Film aria-hidden="true" className="size-6" />
            <span className="px-3 text-center text-xs">{clip?.status === "failed" ? "Generation failed" : "Preview will appear here"}</span>
          </div>}

      <div className="min-w-0 space-y-3 text-xs">
        {clip?.status === "stored" && <p className="leading-relaxed">This scene is ready to review. Other scenes can continue generating in the background.</p>}
        {isGenerating && <p className="text-muted-foreground leading-relaxed">AI is creating this clip. It will be shown here without waiting for the complete joined video.</p>}
        {!runStarted && <p className="text-muted-foreground leading-relaxed">Run the workflow after the scene setup is complete.</p>}
        {runStarted && !clip && !waitingForGeneration && <p className="text-muted-foreground leading-relaxed">This scene is waiting for the video generation step.</p>}
        {clip?.status === "failed" && <p className="text-destructive leading-relaxed">{clip.failure || "AI could not create this scene. Review its source and direction, then try again."}</p>}
        {(clip?.status === "stored" || clip?.status === "failed") && <Button type="button" size="sm" variant="outline" disabled={!canRegenerate || isRegenerating} onClick={onRegenerate}
          className="min-h-11 gap-2 px-4">
          <RotateCcw aria-hidden="true" />
          {isRegenerating ? "Starting again..." : "Regenerate this scene"}
        </Button>}
        {(clip?.status === "stored" || clip?.status === "failed") && !canRegenerate && <p className="text-muted-foreground leading-relaxed">Scene regeneration becomes available while the run is waiting for review or after a generation failure.</p>}
      </div>
    </div>
    <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
      <DialogContent showCloseButton={false} className="h-[90dvh] w-[calc(100%-2rem)] max-w-5xl border-0 bg-transparent p-0 shadow-none">
        <button type="button" aria-label="Close video preview" onClick={() => setIsVideoOpen(false)}
          className="absolute -top-9 right-0 z-10 inline-flex size-8 items-center justify-center text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          <X aria-hidden="true" className="size-6" />
        </button>
        <DialogHeader className="sr-only">
          <DialogTitle>Scene video preview</DialogTitle>
          <DialogDescription>Generated video for scene {sceneNumber}</DialogDescription>
        </DialogHeader>
        {isVideoOpen && clip?.previewUrl && <video key={clip.previewUrl} controls autoPlay playsInline preload="auto"
          aria-label={`Generated video for scene ${sceneNumber}`} className="mx-auto size-full bg-black object-contain">
          <source src={clip.previewUrl} type="video/mp4" />
        </video>}
      </DialogContent>
    </Dialog>
  </section>;
};
