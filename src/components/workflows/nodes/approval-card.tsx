"use client";

import { ShieldCheck } from "lucide-react";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { NodeSummary } from "@/components/workflows/nodes/node-summary";
import { readString, summarizeNodeConfig } from "@/helpers/workflow-config";
import { countApprovals } from "@/helpers/workflow-run";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNode, WorkflowNodeType } from "@/types/workflow";
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
  const summary = summarizeNodeConfig(data.type, data.config).slice(0, 2);
  const isAuto = readString(data.config.mode) === "auto";

  return (
    <NodeShell nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-2.5 px-3 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck
            className={isAuto ? "size-4 text-emerald-600" : "size-4 text-amber-600"}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold text-slate-700">
            {isAuto ? "Automatic approval" : "Manual review"}
          </span>
        </div>
        {summary.length > 0 && <NodeSummary lines={summary} />}
        {counts ? (
          <div className="border-border/70 text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-2 text-[11px]">
            <span>
              <strong className="font-semibold text-slate-800">{counts.approved}</strong> approved
            </span>
            <span className="text-slate-300" aria-hidden="true">
              /
            </span>
            <span>
              <strong className="font-semibold text-slate-800">{counts.rejected}</strong> rejected
            </span>
            <span className="text-slate-300" aria-hidden="true">
              /
            </span>
            <span>
              <strong className="font-semibold text-slate-800">{counts.pending}</strong> to review
            </span>
          </div>
        ) : (
          !isAuto && (
            <p className="border-t border-slate-100 pt-2 text-xs leading-4 text-slate-500">
              {MANUAL_HINTS[data.type] ?? "Review this step before continuing."}
            </p>
          )
        )}
      </div>
    </NodeShell>
  );
};
