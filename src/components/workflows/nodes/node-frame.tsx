"use client";

import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

import { NodeName } from "@/components/workflows/nodes/node-name";
import { NODE_STATUS_PILLS } from "@/constants/workflow-status";
import { getWorkflowNodeDefinition } from "@/helpers/workflow-config";
import { isRunnableNode } from "@/helpers/workflow-run";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNodeCategory, WorkflowNodeData, WorkflowNodeStatus } from "@/types/workflow";
import { cn } from "@/utils/cn";
import { Handle, Position, useConnection } from "@xyflow/react";

const CATEGORY_LABELS: Record<WorkflowNodeCategory, string> = {
  trigger: "Trigger",
  ai: "AI",
  review: "Review",
  output: "Output",
};

const CATEGORY_TEXT: Record<WorkflowNodeCategory, string> = {
  trigger: "text-wf-c1",
  ai: "text-wf-c2",
  review: "text-wf-c3",
  output: "text-wf-c4",
};

const STATUS_DOT: Record<WorkflowNodeStatus, string> = {
  idle: "bg-wf-faint",
  running: "bg-wf-accent",
  success: "bg-wf-ok",
  failed: "bg-wf-fail",
  skipped: "bg-wf-faint",
  waiting_for_input: "bg-wf-warn",
  waiting_for_review: "bg-wf-warn",
  cancelled: "bg-wf-faint",
};

const HANDLE_CLASS_NAME =
  "group/connect flex! size-2.5! cursor-crosshair! items-center! justify-center! border-0! bg-transparent! before:absolute before:size-10 before:rounded-full before:content-['']";

const HANDLE_DOT_CLASS_NAME =
  "border-wf-line bg-wf-surface pointer-events-none absolute size-2.5 rounded-full border transition-[transform,background-color,border-color] duration-150 group-hover/connect:scale-125 motion-reduce:transition-none";

const HANDLE_ACTION_CLASS_NAME =
  "border-wf-line bg-wf-surface text-wf-dim pointer-events-none absolute grid size-6 place-items-center rounded-full border transition-[opacity,scale,background-color,border-color,color] duration-200 ease-out";

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
  const definition = getWorkflowNodeDefinition(data.type);
  if (!definition) return null;
  const pill = data.status === "idle" ? null : NODE_STATUS_PILLS[data.status];
  const isRunning = data.status === "running";
  const runnable = isRunnableNode(data.type);
  const isConnectionTarget =
    connectionState === "valid-target" || connectionState === "invalid-target";
  const progress = Math.max(0, Math.min(100, data.progress ?? 0));
  const statusLabel = isRunning && progress > 0 ? `${pill?.label ?? "Running"} ${Math.round(progress)}%` : pill?.label;

  const frame = cn(
    "border-wf-line bg-wf-surface relative w-full rounded-lg border",
    "hover:border-wf-dim/40",
    isConnectionTarget
      ? connectionState === "invalid-target"
        ? "border-wf-fail z-20 shadow-[0_0_0_1px_var(--wf-fail)]"
        : "border-wf-ok z-20 shadow-[0_0_0_1px_var(--wf-ok)]"
      : isRunning && "border-wf-accent z-10 shadow-[0_0_0_1px_var(--wf-accent)]",
    selected && "border-wf-accent z-10 shadow-[0_0_0_1px_var(--wf-accent)]"
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
          className={cn(HANDLE_CLASS_NAME, "top-[30px]!", "before:size-6!")}
        >
          <span className={HANDLE_DOT_CLASS_NAME} />
        </Handle>
      )}

      <div className="mb-1.5 flex h-6 items-center pl-0.5">
        <NodeName
          nodeId={nodeId}
          label={data.label}
          fallbackLabel={definition.label}
          Icon={definition.icon}
          iconClassName={CATEGORY_TEXT[definition.category]}
        />
      </div>

      <article className={frame}>
        <div className="flex items-center justify-between gap-2 px-2.5 pt-2.5 pb-1.5">
          <span
            className={cn(
              "font-mono text-[9px] leading-none font-semibold tracking-[0.14em] uppercase",
              CATEGORY_TEXT[definition.category]
            )}
          >
            {CATEGORY_LABELS[definition.category]}
          </span>
          {!runnable && data.status === "idle" ? (
            <span className="text-wf-faint shrink-0 text-[9.5px] leading-none font-medium tracking-wide uppercase">
              Planned
            </span>
          ) : (
            <span
              className="text-wf-dim flex shrink-0 items-center gap-1.5 text-[9.5px] leading-none font-medium"
              role={data.status === "idle" ? undefined : "status"}
              aria-live={data.status === "idle" ? undefined : "polite"}
            >
              {isRunning ? (
                <LoaderCircle
                  className="text-wf-accent size-3 motion-safe:animate-spin"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              ) : (
                <span
                  className={cn("size-1.5 rounded-full", STATUS_DOT[data.status])}
                  aria-hidden="true"
                />
              )}
              {statusLabel ?? "Idle"}
            </span>
          )}
        </div>

        {children}
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
              "translate-y-7",
              !workflowIsRunning && HANDLE_ACTION_REVEAL_CLASS_NAME,
              selected && !workflowIsRunning && "pointer-events-auto scale-100 opacity-100",
              connectionState === "valid-target" &&
                "border-wf-ok text-wf-ok pointer-events-auto scale-100 opacity-100",
              connectionState === "invalid-target" &&
                "border-wf-fail text-wf-fail pointer-events-auto scale-100 opacity-100"
            )}
            aria-hidden="true"
          >
            <span className="text-[11px] font-semibold">+</span>
          </span>
        </Handle>
      )}
    </div>
  );
};
