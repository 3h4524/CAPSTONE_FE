"use client";

import { LoaderCircle, Plus } from "lucide-react";
import type { ReactNode } from "react";

import { NodeName } from "@/components/workflows/nodes/node-name";
import { WORKFLOW_CATEGORY_THEME } from "@/constants/workflow-category-theme";
import { NODE_STATUS_PILLS } from "@/constants/workflow-status";
import { getWorkflowNodeDefinition } from "@/helpers/workflow-config";
import { isRunnableNode } from "@/helpers/workflow-run";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowConnectionStore } from "@/stores/workflow-connection";
import type { WorkflowNodeData } from "@/types/workflow";
import { cn } from "@/utils/cn";
import { Handle, Position, useConnection } from "@xyflow/react";

const HANDLE_CLASS_NAME =
  "group/connect flex! size-2.5! cursor-crosshair! items-center! justify-center! border-0! bg-transparent! before:absolute before:size-10 before:rounded-full before:content-['']";

const HANDLE_DOT_CLASS_NAME =
  "border-wf-accent/70 bg-white pointer-events-none absolute size-2.5 rounded-full border shadow-sm transition-[transform,background-color,border-color] duration-150 group-hover/connect:scale-125 motion-reduce:transition-none";

const HANDLE_ACTION_CLASS_NAME =
  "bg-wf-surface text-wf-accent border-wf-line pointer-events-none absolute grid size-7 scale-90 place-items-center rounded-full border opacity-0 shadow-md transition-[opacity,transform,background-color,color,box-shadow] duration-200 ease-out group-hover/connect:scale-105 group-hover/connect:bg-wf-accent group-hover/connect:text-wf-surface motion-reduce:transition-none";

const HANDLE_ACTION_ACCEPTING_CLASS_NAME =
  "border-wf-accent bg-wf-accent text-wf-surface ring-wf-accent/25 scale-100 opacity-100 ring-4 motion-safe:animate-pulse";

const HANDLE_ACTION_REVEAL_CLASS_NAME =
  "group-hover/node:pointer-events-auto group-hover/node:scale-100 group-hover/node:opacity-100 group-focus-within/node:pointer-events-auto group-focus-within/node:scale-100 group-focus-within/node:opacity-100";

type NodeFrameProps = {
  nodeId: string;
  data: WorkflowNodeData;
  selected?: boolean;
  widthClassName: "w-60" | "w-72";
  children?: ReactNode;
};

export const NodeFrame = ({ nodeId, data, selected, widthClassName, children }: NodeFrameProps) => {
  const workflowIsRunning = useWorkflowStore((state) => state.isRunning);
  const connectionState = useConnection((connection) => {
    if (!connection.inProgress) return "idle";
    if (connection.fromNode.id === nodeId) return "source";
    if (connection.toNode?.id !== nodeId) return "candidate";
    return connection.isValid === false ? "invalid-target" : "valid-target";
  });
  const hoveredConnectionValid = useWorkflowConnectionStore((state) =>
    state.hoveredNodeId === nodeId ? state.hoveredNodeValid : null
  );
  const acceptsConnectionFrom = useWorkflowConnectionStore((state) =>
    state.connectableNodeIds.includes(nodeId) ? state.sourceHandleType : null
  );
  const definition = getWorkflowNodeDefinition(data.type);
  if (!definition) return null;
  const theme = WORKFLOW_CATEGORY_THEME[definition.category];
  const pill = data.status === "idle" ? null : NODE_STATUS_PILLS[data.status];
  const isRunning = data.status === "running";
  const runnable = isRunnableNode(data.type);
  const connectionTargetValid = connectionState === "valid-target" || hoveredConnectionValid === true;
  const connectionTargetInvalid = connectionState === "invalid-target" || hoveredConnectionValid === false;
  const isConnectionTarget = connectionTargetValid || connectionTargetInvalid;
  const progress = Math.max(0, Math.min(100, data.progress ?? 0));
  const statusLabel = isRunning && progress > 0 ? `${pill?.label ?? "Running"} ${Math.round(progress)}%` : pill?.label;

  const frame = cn(
    "bg-wf-surface relative w-full rounded-xl border shadow-[0_1px_2px_rgba(15,23,42,0.05),0_18px_36px_-28px_rgba(15,23,42,0.35)]",
    theme.frame,
    "hover:border-wf-accent/50",
    selected && "border-wf-accent ring-wf-accent/20 z-10 ring-2",
    isConnectionTarget
      ? connectionTargetInvalid
        ? "border-wf-fail hover:border-wf-fail ring-wf-fail/25 z-20 ring-4"
        : "border-wf-ok hover:border-wf-ok ring-wf-ok/25 z-20 ring-4"
      : isRunning && "border-wf-accent ring-wf-accent/20 z-10 ring-2"
  );

  return (
    <div className={cn("group/node relative", widthClassName)}>
      {definition.hasInput && (
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={!workflowIsRunning}
          title={`Connect another node to ${data.label}`}
          aria-label={`Connect another node to ${data.label}`}
          className={cn(HANDLE_CLASS_NAME, "top-0!", "before:size-6!")}
        >
          <span className={HANDLE_DOT_CLASS_NAME} />
          <span
            className={cn(
              HANDLE_ACTION_CLASS_NAME,
              "-translate-y-6",
              acceptsConnectionFrom === "source" && HANDLE_ACTION_ACCEPTING_CLASS_NAME
            )}
            aria-hidden="true"
          >
            <Plus className="size-4" strokeWidth={2} />
          </span>
        </Handle>
      )}

      <article className={frame}>
        <div className={cn("flex items-center gap-2 border-b px-2.5 py-2", theme.header)}>
          <NodeName label={data.label} Icon={definition.icon} iconClassName={theme.icon} />
          {!runnable && data.status === "idle" ? (
            <span className="shrink-0 rounded-full border border-slate-200 bg-white/80 px-1.5 py-0.5 text-[9px] leading-none font-semibold tracking-wide text-slate-500 uppercase">
              Planned
            </span>
          ) : pill ? (
            <span
              className={cn("flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] leading-none font-semibold tracking-wide uppercase", pill.className)}
              role="status"
              aria-live="polite"
            >
              {isRunning && (
                <LoaderCircle className="size-2.5 motion-safe:animate-spin" strokeWidth={2.5} aria-hidden="true" />
              )}
              {statusLabel}
            </span>
          ) : null}
        </div>

        <div className="pt-2.5">{children}</div>
      </article>

      {definition.hasOutput && (
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={!workflowIsRunning}
          title={`Connect ${data.label} to another node`}
          aria-label={`Connect ${data.label} to another node`}
          className={HANDLE_CLASS_NAME}
        >
          <span className={HANDLE_DOT_CLASS_NAME} />
          <span
            className={cn(
              HANDLE_ACTION_CLASS_NAME,
              "translate-y-6",
              !workflowIsRunning && HANDLE_ACTION_REVEAL_CLASS_NAME,
              selected && !workflowIsRunning && "pointer-events-auto scale-100 opacity-100",
              connectionState === "source" && "bg-wf-accent text-wf-surface pointer-events-auto scale-100 opacity-100",
              acceptsConnectionFrom === "target" && HANDLE_ACTION_ACCEPTING_CLASS_NAME
            )}
            aria-hidden="true"
          >
            <Plus className="size-4" strokeWidth={2} />
          </span>
        </Handle>
      )}
    </div>
  );
};
