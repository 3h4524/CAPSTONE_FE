"use client";

import { StatusBadge } from "@/components/commons/data-display/status-badge";
import { Card } from "@/components/ui/card";
import { WORKFLOW_CATEGORIES, WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import { summarizeNodeConfig } from "@/helpers/workflow-config";
import type { WorkflowNode, WorkflowNodeStatus } from "@/types/workflow";
import { cn } from "@/utils/cn";
import { Handle, type NodeProps, Position } from "@xyflow/react";

const STATUS_BORDERS: Record<WorkflowNodeStatus, string> = {
  idle: "border-slate-200",
  running: "border-indigo-400 shadow-indigo-100",
  success: "border-emerald-400",
  failed: "border-rose-400",
  skipped: "border-slate-300 opacity-70",
};

const STATUS_BADGES: Record<Exclude<WorkflowNodeStatus, "idle">, { status: string; label: string }> = {
  running: { status: "processing", label: "Running" },
  success: { status: "completed", label: "Done" },
  failed: { status: "failed", label: "Failed" },
  skipped: { status: "closed", label: "Skipped" },
};

const HANDLE_CLASS_NAME = "size-3! border-2! border-white! bg-slate-500!";

export const WorkflowNodeCard = ({ data, selected }: NodeProps<WorkflowNode>) => {
  const definition = WORKFLOW_NODE_DEFINITIONS[data.type];
  const category = WORKFLOW_CATEGORIES.find((item) => item.id === definition.category);
  const Icon = definition.icon;
  const summary = summarizeNodeConfig(data.type, data.config).slice(0, 3);
  const badge = data.status === "idle" ? null : STATUS_BADGES[data.status];

  return (
    <Card
      className={cn(
        "w-56 gap-0 rounded-xl border-2 bg-white py-0 shadow-sm transition-shadow",
        STATUS_BORDERS[data.status],
        data.status === "running" && "animate-pulse",
        selected && "ring-primary/30 ring-4"
      )}
    >
      {definition.hasInput && <Handle type="target" position={Position.Top} className={HANDLE_CLASS_NAME} />}
      <div className="flex items-start gap-3 p-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", category?.accentClassName)}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">{category?.label}</p>
          <p className="truncate text-sm font-semibold text-slate-900">{data.label}</p>
        </div>
      </div>
      {(summary.length > 0 || badge) && (
        <div className="space-y-1 border-t px-3 py-2">
          {summary.map((line) => (
            <p key={line} className="text-muted-foreground truncate text-xs">{line}</p>
          ))}
          {badge && (
            <StatusBadge status={badge.status} className="mt-1 px-2 py-0.5 text-[11px]">{badge.label}</StatusBadge>
          )}
        </div>
      )}
      {definition.hasOutput && <Handle type="source" position={Position.Bottom} className={HANDLE_CLASS_NAME} />}
    </Card>
  );
};
