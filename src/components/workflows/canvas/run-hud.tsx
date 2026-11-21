"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Progress } from "@/components/ui/progress";
import { RUN_HUD_LINGER_MS } from "@/constants/workflow-run-effects";
import { type RunHudPhase, summarizeRun, withLiveListing } from "@/helpers/workflow-run-view";
import { useListingLive } from "@/hooks/use-listing-live";
import { useRunEffects } from "@/hooks/use-run-effects";
import { useWorkflowStore } from "@/stores/workflow";
import { cn } from "@/utils/cn";

const PHASE_TONES: Record<RunHudPhase, { dot: string; text: string; bar: string }> = {
  running: { dot: "bg-wf-accent motion-safe:animate-pulse", text: "text-wf-accent", bar: "bg-wf-accent" },
  attention: { dot: "bg-wf-warn motion-safe:animate-pulse", text: "text-wf-warn", bar: "bg-wf-warn" },
  failed: { dot: "bg-wf-fail", text: "text-wf-fail", bar: "bg-wf-fail" },
  done: { dot: "bg-wf-ok", text: "text-wf-ok", bar: "bg-wf-ok" },
};

export const RunHud = () => {
  const { t } = useTranslation("common");
  const effects = useRunEffects();
  const listingLive = useListingLive();
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const nodes = useWorkflowStore((state) => state.nodes);
  const active = isRunning || listingLive;
  const [wasActive, setWasActive] = useState(active);
  const [lingering, setLingering] = useState(false);

  if (active !== wasActive) {
    setWasActive(active);
    setLingering(!active);
  }

  useEffect(() => {
    if (!lingering) return;
    const timer = window.setTimeout(() => setLingering(false), RUN_HUD_LINGER_MS);
    return () => window.clearTimeout(timer);
  }, [lingering]);

  const summary = summarizeRun(withLiveListing(nodes, listingLive));
  if (!effects || !summary || (!active && !lingering)) return null;

  const tone = PHASE_TONES[summary.phase];
  const names = summary.names.join(" + ");
  const label =
    summary.phase === "done"
      ? t("workflowEditor.runView.hudAllDone")
      : summary.phase === "failed"
        ? t("workflowEditor.runView.hudFailed", { names })
        : summary.phase === "attention"
          ? t("workflowEditor.runView.hudNeedsYou", { names })
          : names || t("workflowEditor.runView.hudStarting");

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-wf-surface border-wf-line animate-in fade-in slide-in-from-top-2 pointer-events-none absolute top-3 left-1/2 z-10 grid w-[min(24rem,calc(100%-1.5rem))] -translate-x-1/2 gap-1.5 rounded-2xl border px-3.5 py-2 shadow-lg"
    >
      <div className="flex items-center gap-2 text-xs">
        <span className={cn("size-2 shrink-0 rounded-full", tone.dot)} aria-hidden="true" />
        <span className="text-wf-faint shrink-0 tabular-nums">
          {t("workflowEditor.runView.hudStep", { current: summary.current, total: summary.total })}
        </span>
        <span className="text-wf-ink truncate font-semibold">{label}</span>
        <span className={cn("ml-auto shrink-0 font-semibold tabular-nums", tone.text)}>{summary.percent}%</span>
      </div>
      <Progress value={summary.percent} className="bg-wf-line h-1" indicatorClassName={tone.bar} />
    </div>
  );
};
