"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";

import { NodeConfigForm } from "@/components/workflows/config-panel/node-config-form";
import { WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import { NODE_STATUS_PILLS } from "@/constants/workflow-status";
import type { WorkflowIssue, WorkflowNode } from "@/types/workflow";
import { cn } from "@/utils/cn";

type WorkflowStepCardProps = {
  node: WorkflowNode;
  stepNumber: number;
  issue?: WorkflowIssue;
  isExpanded: boolean;
  /** Long settings and run results open full screen instead of inside the card. */
  opensFullScreen: boolean;
  onToggle: () => void;
};

/** One step of the phone's workflow list: what it is, whether it is ready, and its settings. */
export const WorkflowStepCard = ({ node, stepNumber, issue, isExpanded, opensFullScreen, onToggle }: WorkflowStepCardProps) => {
  const cardRef = useRef<HTMLElement>(null);
  const definition = WORKFLOW_NODE_DEFINITIONS[node.data.type];
  const Icon = definition.icon;
  const showsInline = isExpanded && !opensFullScreen;
  const pill = node.data.status === "idle" ? null : NODE_STATUS_PILLS[node.data.status];
  const isTrigger = definition.category === "trigger";

  useEffect(() => {
    if (showsInline) cardRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  }, [showsInline]);

  return (
    <article
      ref={cardRef}
      className={cn("bg-card scroll-mt-16 rounded-2xl border shadow-sm", isExpanded && "border-primary ring-primary/20 ring-2")}
    >
      <button
        type="button"
        aria-expanded={showsInline}
        onClick={onToggle}
        className="focus-visible:ring-ring/40 flex min-h-16 w-full items-center gap-3 rounded-2xl p-4 text-left outline-none focus-visible:ring-2"
      >
        <span className="bg-muted text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink-900">{node.data.label}</span>
          {issue ? (
            <span className="mt-0.5 flex items-center gap-1 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">Needs attention</span>
            </span>
          ) : pill ? null : (
            <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
              <CheckCircle2 className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Ready
            </span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-semibold">
            {isTrigger ? "Trigger" : `Step ${stepNumber}`}
          </span>
          {pill && (
            <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", pill.className)}>{pill.label}</span>
          )}
        </span>
        <ChevronDown
          className={cn("text-muted-foreground size-4 shrink-0 transition-transform", showsInline && "rotate-180", opensFullScreen && "-rotate-90")}
          aria-hidden="true"
        />
      </button>
      {showsInline && (
        <div className="overflow-hidden rounded-b-2xl border-t">
          <NodeConfigForm key={node.id} node={node} showHeader={false} />
        </div>
      )}
    </article>
  );
};
