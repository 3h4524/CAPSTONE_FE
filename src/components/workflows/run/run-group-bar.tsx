"use client";

import { useRouter } from "next/navigation";
import { Clapperboard, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { runStatusOf } from "@/components/workflows/run/run-group-panel";
import { RUN_GROUP_PARAM } from "@/constants/run-group";
import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import { useWorkflowRuntime, VIDEO_RUN_PARAM } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";
import { cn } from "@/utils/cn";

const DOT: Record<string, string> = {
  queued: "bg-slate-400",
  running: "bg-sky-500 animate-pulse",
  waiting_for_input: "bg-amber-500",
  waiting_for_review: "bg-violet-500",
  completed: "bg-emerald-500",
  failed: "bg-rose-500",
  cancelled: "bg-slate-300",
};

// Above the canvas while a batch video run is open: how its videos are doing, and one chip per design. A chip opens
// that design's run, so every step on the canvas (storyboard, review, export) shows that design's video.
export const RunGroupBar = () => {
  const router = useRouter();
  const groupId = useRunGroupId();
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const { data: group } = useRunGroup(groupId);
  const { runId, selectRun } = useWorkflowRuntime();
  if (!group || group.workflowId !== workflowId) return null;

  const close = () => {
    const query = new URLSearchParams(window.location.search);
    query.delete(RUN_GROUP_PARAM);
    query.delete(VIDEO_RUN_PARAM);
    useWorkflowStore.getState().setVideoRunId(null);
    const rest = query.toString();
    router.replace(rest ? `/workflows?${rest}` : "/workflows", { scroll: false });
  };
  const openGate = () => {
    const gate = useWorkflowStore.getState().nodes.find((node) => node.data.type === "approval-gate");
    if (gate) selectNode(gate.id);
  };
  const { progress } = group;
  const withRuns = group.targets.filter((target) => target.runId);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-xl border bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <Clapperboard className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        {group.status === "waiting_for_targets" ? (
          <>
            <span className="text-sm whitespace-nowrap">
              Choose the designs · <strong>{group.selectedCount}</strong> video{group.selectedCount === 1 ? "" : "s"}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={openGate}>Mockup Approval</Button>
          </>
        ) : (
          <>
            <span className="text-sm whitespace-nowrap">
              <strong>{progress.completed}</strong>/{progress.total} done
              {progress.waitingForReview > 0 && <> · {progress.waitingForReview} to review</>}
              {progress.failed > 0 && <span className="text-rose-700"> · {progress.failed} failed</span>}
            </span>
            <div className="flex min-w-0 gap-1 overflow-x-auto" role="list" aria-label="Videos of this run">
              {withRuns.map((target) => {
                const active = target.runId === runId;
                return (
                  <button
                    key={target.key}
                    type="button"
                    role="listitem"
                    title={`${target.productName} · ${target.designLabel}: ${runStatusOf(target.runStatus).label}`}
                    onClick={() => selectRun(target.runId!)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                      active ? "border-primary bg-primary/10 font-medium" : "hover:bg-slate-50"
                    )}
                    aria-current={active ? "true" : undefined}
                  >
                    <span className={cn("size-2 rounded-full", DOT[target.runStatus ?? ""] ?? "bg-slate-300")} aria-hidden="true" />
                    <span className="max-w-36 truncate">{target.productName} · {target.designLabel}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        <Button type="button" size="icon" variant="ghost" className="size-7 shrink-0" aria-label="Stop following this run" onClick={close}>
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
