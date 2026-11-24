"use client";

import { LoaderCircle, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { NodeName } from "@/components/workflows/nodes/node-name";
import { RunPreviewCallout } from "@/components/workflows/nodes/preview/run-preview-callout";
import { WORKFLOW_CATEGORY_THEME } from "@/constants/workflow-category-theme";
import { NODE_STATUS_PILLS } from "@/constants/workflow-status";
import { getWorkflowNodeDefinition } from "@/helpers/workflow-config";
import { isRunnableNode } from "@/helpers/workflow-run";
import { useNodeRunStatus } from "@/hooks/use-node-run-status";
import { useRunEffects } from "@/hooks/use-run-effects";
import { useRunPreviewVisible } from "@/hooks/use-run-preview-visible";
import { useStatusPop } from "@/hooks/use-status-pop";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowConnectionStore } from "@/stores/workflow-connection";
import { useNodeHasContentIssue } from "@/stores/workflow-content-issues";
import type { WorkflowNodeData } from "@/types/workflow";
import { cn } from "@/utils/cn";
import { Handle, Position, useConnection } from "@xyflow/react";

const HANDLE_CLASS_NAME =
  "group/connect flex! size-2.5! cursor-crosshair! items-center! justify-center! border-0! bg-transparent! before:absolute before:size-10 before:rounded-full before:content-['']";

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
  const { t } = useTranslation("common");
  const workflowIsRunning = useWorkflowStore((state) => state.isRunning);
  const effects = useRunEffects();
  const { status, progress, listingLive } = useNodeRunStatus(data);
  const showsPreview = useRunPreviewVisible(data);
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
  // A setting of this step the content check refused when the workflow was saved or run.
  const hasContentIssue = useNodeHasContentIssue(nodeId);
  const { popping, endPop } = useStatusPop(status);
  const definition = getWorkflowNodeDefinition(data.type);
  if (!definition) return null;
  const theme = WORKFLOW_CATEGORY_THEME[definition.category];
  const pill = status === "idle" ? null : NODE_STATUS_PILLS[status];
  const isRunning = status === "running";
  const runnable = isRunnableNode(data.type);
  const connectionTargetValid =
    connectionState === "valid-target" || hoveredConnectionValid === true;
  const connectionTargetInvalid =
    connectionState === "invalid-target" || hoveredConnectionValid === false;
  const isConnectionTarget = connectionTargetValid || connectionTargetInvalid;
  const pillLabel = pill
    ? t(`workflowEditor.nodeStatuses.${status}`, { defaultValue: pill.label })
    : undefined;
  const statusLabel =
    isRunning && progress > 0
      ? `${pillLabel ?? t("workflowEditor.nodeStatuses.running")} ${Math.round(progress)}%`
      : pillLabel;

  const runActive = workflowIsRunning || listingLive;
  const waiting = status === "waiting_for_input" || status === "waiting_for_review";
  const dimmed = effects && runActive && status === "idle";
  const runEffects = cn(
    effects && isRunning && "animate-wf-run-glow",
    effects && popping && "animate-wf-run-pop",
    effects && status === "failed" && "animate-wf-run-shake ring-wf-fail/30 ring-4",
    effects && waiting && "border-wf-warn animate-wf-run-attention"
  );

  const frame = cn(
    "bg-wf-surface relative w-full rounded-xl border shadow-[0_1px_2px_rgba(15,23,42,0.05),0_18px_36px_-28px_rgba(15,23,42,0.35)]",
    theme.frame,
    "hover:border-wf-accent/50",
    selected && "border-wf-accent ring-wf-accent/20 z-10 ring-2",
    isConnectionTarget
      ? connectionTargetInvalid
        ? "border-wf-fail hover:border-wf-fail ring-wf-fail/25 z-20 ring-4"
        : "border-wf-ok hover:border-wf-ok ring-wf-ok/25 z-20 ring-4"
      : hasContentIssue
        ? "border-wf-fail hover:border-wf-fail ring-wf-fail/25 z-10 ring-2"
        : isRunning && "border-wf-accent ring-wf-accent/20 z-10 ring-2",
    runEffects
  );

  return (
    <div
      className={cn(
        "group/node relative transition-[opacity,filter] duration-500",
        widthClassName,
        dimmed && "opacity-40 grayscale",
        showsPreview && "z-20"
      )}
    >
      {definition.hasInput && (
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={!workflowIsRunning}
          title={t("workflowEditor.nodeFrame.connectTo", { label: data.label })}
          aria-label={t("workflowEditor.nodeFrame.connectTo", { label: data.label })}
          className={cn(
            HANDLE_CLASS_NAME,
            "top-0!",
            "before:size-6! [@media(pointer:coarse)]:before:size-11!"
          )}
        >
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

      <article className={frame} onAnimationEnd={endPop}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-t-[calc(var(--radius-xl)-1px)] border-b px-2.5 py-2",
            theme.header
          )}
        >
          <NodeName label={data.label} Icon={definition.icon} iconClassName={theme.icon} />
          {!runnable && data.status === "idle" ? (
            <span className="border-ink-200 bg-card/80 text-ink-500 shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] leading-none font-semibold tracking-wide uppercase">
              {t("workflowEditor.nodeFrame.planned")}
            </span>
          ) : pill ? (
            <span
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] leading-none font-semibold tracking-wide uppercase",
                pill.className
              )}
              role="status"
              aria-live="polite"
            >
              {isRunning && (
                <LoaderCircle
                  className="size-2.5 motion-safe:animate-spin"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              )}
              {statusLabel}
            </span>
          ) : null}
        </div>

        <div className="pt-2.5">{children}</div>
        {effects && isRunning && (
          <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden rounded-b-xl" aria-hidden="true">
            <span
              className="from-wf-accent to-wf-cat-ai block h-full bg-gradient-to-r transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </span>
        )}
      </article>

      {showsPreview && <RunPreviewCallout nodeId={nodeId} data={data} status={status} progress={progress} />}

      {definition.hasOutput && (
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={!workflowIsRunning}
          title={t("workflowEditor.nodeFrame.connectFrom", { label: data.label })}
          aria-label={t("workflowEditor.nodeFrame.connectFrom", { label: data.label })}
          className={HANDLE_CLASS_NAME}
        >
          <span
            className={cn(
              HANDLE_ACTION_CLASS_NAME,
              "translate-y-6",
              !workflowIsRunning && HANDLE_ACTION_REVEAL_CLASS_NAME,
              selected && !workflowIsRunning && "pointer-events-auto scale-100 opacity-100",
              connectionState === "source" &&
                "bg-wf-accent text-wf-surface pointer-events-auto scale-100 opacity-100",
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
