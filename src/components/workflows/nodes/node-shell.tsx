"use client";

import type { ReactNode } from "react";

import { getWorkflowNodeDefinition } from "@/helpers/workflow-config";
import type { WorkflowNodeData, WorkflowNodeStatus } from "@/types/workflow";
import { cn } from "@/utils/cn";
import { Handle, Position } from "@xyflow/react";

const STATUS_RINGS: Record<WorkflowNodeStatus, string> = {
  idle: "ring-white/10",
  running: "ring-indigo-400",
  success: "ring-emerald-400",
  failed: "ring-rose-400",
  skipped: "ring-slate-500",
};

const STATUS_PILLS: Record<
  Exclude<WorkflowNodeStatus, "idle">,
  { className: string; label: string }
> = {
  running: { className: "bg-indigo-100 text-indigo-700", label: "Running" },
  success: { className: "bg-emerald-100 text-emerald-700", label: "Done" },
  failed: { className: "bg-rose-100 text-rose-700", label: "Failed" },
  skipped: { className: "bg-slate-200 text-slate-600", label: "Skipped" },
};

const HANDLE_CLASS_NAME = "size-4! rounded-full! border-2! border-white! bg-indigo-500!";

type NodeShellProps = {
  data: WorkflowNodeData;
  selected?: boolean;
  widthClassName: "w-60" | "w-72";
  children?: ReactNode;
};

export const NodeShell = ({ data, selected, widthClassName, children }: NodeShellProps) => {
  const definition = getWorkflowNodeDefinition(data.type);
  if (!definition) return null;
  const Icon = definition.icon;
  const pill = data.status === "idle" ? null : STATUS_PILLS[data.status];

  return (
    <div className={cn("flex flex-col gap-1.5", widthClassName)}>
      <div className="flex items-center gap-1.5 px-0.5">
        <Icon className="size-3.5 shrink-0 text-slate-500" aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{data.label}</p>
        {pill && (
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", pill.className)}>
            {pill.label}
          </span>
        )}
      </div>
      <div
        className={cn(
          "relative rounded-xl bg-slate-900 text-slate-100 shadow-lg ring-1 transition-shadow",
          STATUS_RINGS[data.status],
          data.status === "running" && "animate-pulse",
          selected && "ring-2 ring-indigo-400"
        )}
      >
        {definition.hasInput && <Handle type="target" position={Position.Top} className={HANDLE_CLASS_NAME} />}
        {children}
        {definition.hasOutput && <Handle type="source" position={Position.Bottom} className={HANDLE_CLASS_NAME} />}
      </div>
    </div>
  );
};
