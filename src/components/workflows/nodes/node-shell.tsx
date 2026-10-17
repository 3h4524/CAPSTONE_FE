"use client";

import type { ReactNode } from "react";

import { NodeName } from "@/components/workflows/nodes/node-name";
import { WORKFLOW_CATEGORIES } from "@/constants/workflow";
import { NODE_STATUS_PILLS } from "@/constants/workflow-status";
import { getWorkflowNodeDefinition } from "@/helpers/workflow-config";
import { isRunnableNode } from "@/helpers/workflow-run";
import type { WorkflowNodeData, WorkflowNodeStatus } from "@/types/workflow";
import { cn } from "@/utils/cn";
import { Handle, Position } from "@xyflow/react";

const STATUS_BORDERS: Record<WorkflowNodeStatus, string> = {
  idle: "border-slate-200",
  running: "border-indigo-400 shadow-indigo-100",
  success: "border-emerald-400",
  failed: "border-rose-400",
  skipped: "border-slate-300 opacity-70",
  waiting_for_input: "border-amber-400",
  waiting_for_review: "border-amber-400",
  cancelled: "border-slate-300 opacity-70",
};

const HANDLE_CLASS_NAME = "size-4! rounded-full! border-2! border-white! bg-indigo-500!";

type NodeShellProps = {
  nodeId: string;
  data: WorkflowNodeData;
  selected?: boolean;
  widthClassName: "w-60" | "w-72";
  bodyClassName?: string;
  children?: ReactNode;
};

export const NodeShell = ({ nodeId, data, selected, widthClassName, bodyClassName, children }: NodeShellProps) => {
  const definition = getWorkflowNodeDefinition(data.type);
  if (!definition) return null;
  const category = WORKFLOW_CATEGORIES.find((item) => item.id === definition.category);
  const pill = data.status === "idle" ? null : NODE_STATUS_PILLS[data.status];

  return (
    <div className={cn("flex flex-col gap-1.5", widthClassName)}>
      <div className="flex items-center gap-1.5 px-0.5">
        <NodeName
          nodeId={nodeId}
          label={data.label}
          fallbackLabel={definition.label}
          Icon={definition.icon}
          iconClassName={category?.iconClassName}
        />
        {pill && (
          <span className={cn("ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", pill.className)}>
            {pill.label}
          </span>
        )}
        {!pill && !isRunnableNode(data.type) && (
          <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            Coming soon
          </span>
        )}
      </div>
      <div
        className={cn(
          "relative rounded-xl border-2 bg-white shadow-sm transition-shadow",
          STATUS_BORDERS[data.status],
          data.status === "running" && "motion-safe:animate-pulse",
          selected && "ring-primary/30 ring-4",
          bodyClassName
        )}
      >
        {definition.hasInput && <Handle type="target" position={Position.Top} className={HANDLE_CLASS_NAME} />}
        {children}
        {data.stage && <p className="px-3 pb-3 text-xs" role="status">{data.stage} · {data.progress ?? 0}%</p>}
        {definition.hasOutput && <Handle type="source" position={Position.Bottom} className={HANDLE_CLASS_NAME} />}
      </div>
    </div>
  );
};
