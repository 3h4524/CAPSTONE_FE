"use client";

import { ShieldCheck } from "lucide-react";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { NodeSummary } from "@/components/workflows/nodes/node-summary";
import { readString, summarizeNodeConfig } from "@/helpers/workflow-config";
import { countApprovals } from "@/helpers/workflow-run";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNode, WorkflowNodeType } from "@/types/workflow";
import { cn } from "@/utils/cn";
import type { NodeProps } from "@xyflow/react";

// What each review step waits for while it is on manual review.
const MANUAL_HINTS: Partial<Record<WorkflowNodeType, string>> = {
  "design-approval": "Designs pause here until approved.",
  "approval-gate": "Approve current mockup revisions before rendering.",
  "review-video": "Approve the exact video version before export.",
};

export const ApprovalCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const job = useWorkflowRunStore((state) => state.job);
  // The counts are of designs, so only Design approval shows them.
  const counts = data.type === "design-approval" && job?.requireApproval === true ? countApprovals(job) : null;
  const summary = summarizeNodeConfig(data.type, data.config).slice(0, 2);
  const isAuto = readString(data.config.mode) === "auto";

  return (
    <NodeShell nodeId={id} data={data} selected={selected} widthClassName="w-60" bodyClassName="border-amber-300 bg-amber-50">
      <div className="flex flex-col items-center gap-1.5 p-3 text-center">
        <ShieldCheck className="size-7 text-amber-500" aria-hidden="true" />
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            isAuto ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
          )}
        >
          {isAuto ? "Auto-approve" : "Manual review"}
        </span>
        <NodeSummary lines={summary} tone="amber" />
        {counts ? (
          <p className="text-[11px] leading-snug text-amber-800">
            {counts.approved} approved · {counts.rejected} rejected · {counts.pending} to review
          </p>
        ) : (
          !isAuto && <p className="text-[11px] leading-snug text-amber-700">{MANUAL_HINTS[data.type] ?? "Paused here until approved."}</p>
        )}
      </div>
    </NodeShell>
  );
};
