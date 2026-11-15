"use client";

import { NodeField } from "@/components/workflows/nodes/node-field";
import { NodeFrame } from "@/components/workflows/nodes/node-frame";
import { NodeReadonlyText } from "@/components/workflows/nodes/node-readonly-text";
import { NodeSegmented } from "@/components/workflows/nodes/node-segmented";
import { getSelectFieldLabel, getSelectFieldOptions, readString } from "@/helpers/workflow-config";
import { countApprovals } from "@/helpers/workflow-run";
import { groupVideoState, useGroupVideos } from "@/hooks/queries/use-group-videos";
import { useNodeSettingsLocked } from "@/hooks/use-node-settings-locked";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNode, WorkflowNodeType } from "@/types/workflow";
import { cn } from "@/utils/cn";
import type { NodeProps } from "@xyflow/react";

const MANUAL_HINTS: Partial<Record<WorkflowNodeType, string>> = {
  "design-approval": "Review generated designs before mock-ups are created.",
  "approval-gate": "Approve the current mock-up revisions before rendering.",
  "review-video": "Review the finished cut before it is exported.",
};

export const ApprovalCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const job = useWorkflowRunStore((state) => state.job);
  const { videos } = useGroupVideos();
  // Design approval counts its designs; Review Video counts the videos of the open batch video run, a failed one
  // standing where a rejected design does. Without a batch video run Review Video has nothing to count.
  const videoStates = videos.map((item) => groupVideoState(item.target));
  const counts =
    data.type === "design-approval" && job?.requireApproval === true
      ? { ...countApprovals(job), rejectedLabel: "rejected" }
      : data.type === "review-video" && videoStates.length > 0
        ? {
            approved: videoStates.filter((state) => state === "approved").length,
            rejected: videoStates.filter((state) => state === "stopped").length,
            pending: videoStates.filter((state) => state !== "approved" && state !== "stopped").length,
            rejectedLabel: "failed",
          }
        : null;
  const mode = readString(data.config.mode);
  const hint =
    mode === "auto" && data.type === "design-approval"
      ? "Every generated design goes straight to mock-ups."
      : mode === "auto" && data.type === "approval-gate"
        ? "Mock-ups waiting for review are approved and the video starts."
        : mode === "auto" && data.type === "review-video"
          ? "Finished videos are approved and exported."
          : MANUAL_HINTS[data.type];
  const total = counts ? counts.approved + counts.rejected + counts.pending : 0;
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const disabled = useNodeSettingsLocked(data.type);
  const modeOptions = getSelectFieldOptions(data.type, "mode").map((option) => ({
    ...option,
    label: option.value === "manual" ? "Manual" : "Auto",
  }));

  return (
    <NodeFrame nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-1.5 px-2.5 pb-2.5">
        {data.type === "design-approval" || data.type === "approval-gate" || data.type === "review-video" ? (
          <NodeSegmented
            options={modeOptions}
            value={mode}
            onChange={(next) => updateNodeConfig(id, { ...data.config, mode: next })}
            disabled={disabled}
            ariaLabel="Approval mode"
          />
        ) : (
          <NodeField value={getSelectFieldLabel(data.type, "mode", mode)} placeholder="Manual review" />
        )}

        {data.type === "review-video" && !counts && <NodeReadonlyText placeholder="Waiting for the latest cut" />}

        {counts && total > 0 && (
          <>
            <div className="bg-wf-line flex h-1.5 gap-px overflow-hidden rounded-full" aria-hidden="true">
              <span className="bg-wf-ok h-full" style={{ width: `${(counts.approved / total) * 100}%` }} />
              <span className="bg-wf-fail h-full" style={{ width: `${(counts.rejected / total) * 100}%` }} />
              <span className="bg-wf-line h-full flex-1" />
            </div>
            <p className="text-wf-dim flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] leading-none">
              <span className="flex items-center gap-1">
                <span className="bg-wf-ok size-1.5 rounded-full" aria-hidden="true" />
                {counts.approved} approved
              </span>
              <span className="flex items-center gap-1">
                <span className="bg-wf-fail size-1.5 rounded-full" aria-hidden="true" />
                {counts.rejected} {counts.rejectedLabel}
              </span>
              <span className={cn("flex items-center gap-1", counts.pending > 0 && "text-wf-warn")}>
                <span className="bg-wf-line size-1.5 rounded-full" aria-hidden="true" />
                {counts.pending} pending
              </span>
            </p>
          </>
        )}

        {hint && <p className="text-wf-faint px-0.5 text-[10px] leading-4">{hint}</p>}
      </div>
    </NodeFrame>
  );
};
