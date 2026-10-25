"use client";

import { LoaderCircle, Plus } from "lucide-react";
import type { ReactNode } from "react";

import { NodeName } from "@/components/workflows/nodes/node-name";
import { WORKFLOW_CATEGORIES } from "@/constants/workflow";
import { NODE_STATUS_PILLS } from "@/constants/workflow-status";
import { getWorkflowNodeDefinition } from "@/helpers/workflow-config";
import { isRunnableNode } from "@/helpers/workflow-run";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNodeData, WorkflowNodeStatus } from "@/types/workflow";
import { cn } from "@/utils/cn";
import { Handle, Position, useConnection } from "@xyflow/react";

const STATUS_DOTS: Record<WorkflowNodeStatus, string> = {
  idle: "bg-slate-300",
  running: "bg-sky-500",
  success: "bg-emerald-500",
  failed: "bg-rose-500",
  skipped: "bg-slate-400",
  waiting_for_input: "bg-amber-500",
  waiting_for_review: "bg-amber-500",
  cancelled: "bg-slate-400",
};

const STATUS_BORDERS: Record<WorkflowNodeStatus, string> = {
  idle: "border-border hover:border-slate-300",
  running: "border-sky-400 hover:border-sky-500",
  success: "border-emerald-400 hover:border-emerald-500",
  failed: "border-rose-400 hover:border-rose-500",
  skipped: "border-slate-300 hover:border-slate-400",
  waiting_for_input: "border-amber-400 hover:border-amber-500",
  waiting_for_review: "border-amber-400 hover:border-amber-500",
  cancelled: "border-slate-300 hover:border-slate-400",
};

const HANDLE_CLASS_NAME =
  "group/connect flex! size-2.5! cursor-crosshair! items-center! justify-center! border-0! bg-transparent! before:absolute before:size-11 before:rounded-full before:content-['']";

const HANDLE_DOT_CLASS_NAME =
  "pointer-events-none absolute size-2.5 rounded-full border-2 border-white bg-slate-400 shadow-sm transition-[background-color,box-shadow,transform] duration-150 group-hover/connect:scale-110 group-hover/connect:bg-slate-700 group-hover/connect:shadow-[0_0_0_4px_rgba(148,163,184,0.18)] motion-reduce:transition-none";

const HANDLE_ACTION_CLASS_NAME =
  "bg-card text-primary border-border pointer-events-none absolute grid size-8 scale-90 place-items-center rounded-full border opacity-0 shadow-[0_4px_12px_rgba(15,23,42,0.14)] transition-[opacity,transform,background-color,color,box-shadow] duration-200 ease-out group-hover/connect:scale-105 group-hover/connect:bg-primary group-hover/connect:text-primary-foreground group-hover/connect:shadow-[0_6px_16px_rgba(15,23,42,0.2)] motion-reduce:transition-none";

const HANDLE_ACTION_REVEAL_CLASS_NAME =
  "group-hover/node:pointer-events-auto group-hover/node:scale-100 group-hover/node:opacity-100 group-focus-within/node:pointer-events-auto group-focus-within/node:scale-100 group-focus-within/node:opacity-100";

type NodeShellProps = {
  nodeId: string;
  data: WorkflowNodeData;
  selected?: boolean;
  widthClassName: "w-60" | "w-72";
  children?: ReactNode;
};

export const NodeShell = ({ nodeId, data, selected, widthClassName, children }: NodeShellProps) => {
  const workflowIsRunning = useWorkflowStore((state) => state.isRunning);
  const connectionState = useConnection((connection) => {
    if (!connection.inProgress) return "idle";
    if (connection.fromNode.id === nodeId) return "source";
    if (connection.toNode?.id !== nodeId) return "candidate";
    return connection.isValid === false ? "invalid-target" : "valid-target";
  });
  const definition = getWorkflowNodeDefinition(data.type);
  if (!definition) return null;
  const category = WORKFLOW_CATEGORIES.find((item) => item.id === definition.category);
  const status = data.status === "idle" ? null : NODE_STATUS_PILLS[data.status];
  const progress = Math.max(0, Math.min(100, data.progress ?? 0));
  const Icon = definition.icon;
  const isRunning = data.status === "running";
  const isConnectionTarget =
    connectionState === "valid-target" || connectionState === "invalid-target";
  const showIncomingAction =
    !workflowIsRunning && connectionState !== "idle" && connectionState !== "source";

  return (
    <div className={cn("group/node relative", widthClassName)}>
      {definition.hasInput && (
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={!workflowIsRunning}
          title={`Connect another node to ${data.label}`}
          aria-label={`Connect another node to ${data.label}`}
          className={HANDLE_CLASS_NAME}
        >
          <span
            className={cn(
              HANDLE_DOT_CLASS_NAME,
              isConnectionTarget &&
                (connectionState === "valid-target"
                  ? "scale-125 bg-sky-600 shadow-[0_0_0_5px_rgba(14,165,233,0.2)]"
                  : "scale-125 bg-rose-500 shadow-[0_0_0_5px_rgba(244,63,94,0.18)]")
            )}
          />
          <span
            className={cn(
              HANDLE_ACTION_CLASS_NAME,
              "-translate-y-6",
              !workflowIsRunning && HANDLE_ACTION_REVEAL_CLASS_NAME,
              selected &&
                !workflowIsRunning &&
                "pointer-events-auto scale-100 opacity-100",
              showIncomingAction && "pointer-events-auto scale-100 opacity-100",
              connectionState === "valid-target" &&
                "border-sky-600 bg-sky-600 text-white shadow-[0_8px_20px_rgba(2,132,199,0.28)]",
              connectionState === "invalid-target" &&
                "border-rose-500 bg-rose-500 text-white shadow-[0_8px_20px_rgba(225,29,72,0.24)]"
            )}
            aria-hidden="true"
          >
            <Plus className="size-4" strokeWidth={2} />
          </span>
        </Handle>
      )}
      <article
        className={cn(
          "bg-card relative overflow-visible rounded-lg border transition-[border-color,box-shadow,background-color,transform] duration-150 ease-out motion-reduce:transform-none motion-reduce:transition-none",
          STATUS_BORDERS[data.status],
          connectionState === "valid-target"
            ? "z-20 scale-[1.015] rotate-[-0.6deg] border-sky-500 bg-sky-50/70 shadow-[0_12px_28px_rgba(2,132,199,0.18),0_0_0_4px_rgba(14,165,233,0.13)]"
            : connectionState === "invalid-target"
              ? "z-20 rotate-[0.35deg] border-rose-500 bg-rose-50/70 shadow-[0_10px_24px_rgba(225,29,72,0.14),0_0_0_4px_rgba(244,63,94,0.1)]"
              : isRunning
                ? "z-10 border-sky-500 bg-sky-50/55 shadow-[0_10px_26px_rgba(2,132,199,0.18),0_0_0_4px_rgba(14,165,233,0.14)]"
                : selected
                  ? "z-10 shadow-[0_0_0_2px_rgba(39,55,80,0.14)]"
                  : "shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_3px_10px_rgba(15,23,42,0.07)]"
        )}
      >
        {isRunning && (
          <span
            className="absolute inset-x-3 top-0 h-0.5 overflow-hidden rounded-full bg-sky-100"
            aria-hidden="true"
          >
            <span className="block h-full w-full bg-gradient-to-r from-transparent via-sky-500 to-transparent motion-safe:animate-pulse" />
          </span>
        )}
        <header
          className={cn(
            "border-border/70 flex min-h-11 items-center gap-2 border-b px-3 py-2 transition-colors duration-150",
            isRunning && "border-sky-200/90 bg-sky-100/65"
          )}
        >
          <NodeName
            nodeId={nodeId}
            label={data.label}
            fallbackLabel={definition.label}
            Icon={Icon}
            iconClassName={category?.iconClassName}
          />
          {status ? (
            <span
              className={cn(
                "text-muted-foreground ml-auto flex shrink-0 items-center gap-1.5 text-[11px] font-medium",
                isRunning &&
                  "rounded-full border border-sky-200 bg-white/85 px-2 py-1 font-semibold text-sky-700 shadow-sm"
              )}
              role="status"
              aria-live="polite"
            >
              {isRunning ? (
                <LoaderCircle
                  className="size-3.5 motion-safe:animate-spin"
                  strokeWidth={2.25}
                  aria-hidden="true"
                />
              ) : (
                <span
                  className={cn("size-1.5 rounded-full", STATUS_DOTS[data.status])}
                  aria-hidden="true"
                />
              )}
              {status.label}
            </span>
          ) : !isRunnableNode(data.type) ? (
            <span className="ml-auto shrink-0 text-[10px] font-medium tracking-wide text-slate-400 uppercase">
              Planned
            </span>
          ) : null}
        </header>
        {children}
        {data.stage && (
          <div
            className={cn(
              "border-border/70 space-y-1.5 border-t px-3 py-2",
              isRunning && "border-sky-200/90 bg-sky-50/80"
            )}
            role="status"
          >
            <div
              className={cn(
                "text-muted-foreground flex items-center justify-between gap-2 text-[11px] leading-4",
                isRunning && "font-medium text-sky-800"
              )}
            >
              <span className="min-w-0 truncate">{data.stage}</span>
              <span className="shrink-0 tabular-nums">{progress}%</span>
            </div>
            <div
              className={cn("bg-muted h-1 overflow-hidden rounded-full", isRunning && "bg-sky-100")}
            >
              <div
                className={cn(
                  "bg-primary-blue h-full rounded-full transition-[width] duration-300",
                  isRunning && "bg-sky-500 motion-safe:animate-pulse"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
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
          <span
            className={cn(
              HANDLE_DOT_CLASS_NAME,
              connectionState === "source" &&
                "scale-125 bg-sky-600 shadow-[0_0_0_5px_rgba(14,165,233,0.2)]"
            )}
          />
          <span
            className={cn(
              HANDLE_ACTION_CLASS_NAME,
              "translate-y-6",
              !workflowIsRunning && HANDLE_ACTION_REVEAL_CLASS_NAME,
              selected &&
                !workflowIsRunning &&
                "pointer-events-auto scale-100 opacity-100",
              connectionState === "source" &&
                "pointer-events-auto scale-100 border-sky-600 bg-sky-600 text-white opacity-100 shadow-[0_8px_20px_rgba(2,132,199,0.28)]"
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
