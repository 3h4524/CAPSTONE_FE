"use client";

import { NodeField } from "@/components/workflows/nodes/node-field";
import { NodeFrame } from "@/components/workflows/nodes/node-frame";
import { NodeReadonlyText } from "@/components/workflows/nodes/node-readonly-text";
import { getSelectFieldLabel, readString } from "@/helpers/workflow-config";
import { countApprovals } from "@/helpers/workflow-run";
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
  const counts =
    data.type === "design-approval" && job?.requireApproval === true ? countApprovals(job) : null;
  const mode = readString(data.config.mode);
  const hint = MANUAL_HINTS[data.type];
  const total = counts ? counts.approved + counts.rejected + counts.pending : 0;

  return (
    <NodeFrame nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="[&>div]:before:text-wf-accent space-y-1.5 px-2.5 pb-2.5 [&>div]:relative [&>div]:pl-4 [&>div]:before:absolute [&>div]:before:top-0 [&>div]:before:left-0 [&>div]:before:font-mono [&>div]:before:text-[10px] [&>div]:before:leading-8 [&>div]:before:content-['>']">
        {data.type === "review-video" ? (
          <NodeReadonlyText placeholder="Waiting for the latest cut" />
        ) : (
          <NodeField value={getSelectFieldLabel(data.type, "mode", mode)} placeholder="Choose approval mode" chevron />
        )}

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
                {counts.rejected} rejected
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
