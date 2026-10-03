"use client";

import { ShieldCheck } from "lucide-react";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { NodeSummary } from "@/components/workflows/nodes/node-summary";
import { readString, summarizeNodeConfig } from "@/helpers/workflow-config";
import type { WorkflowNode } from "@/types/workflow";
import { cn } from "@/utils/cn";
import type { NodeProps } from "@xyflow/react";

export const ApprovalCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
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
        {!isAuto && <p className="text-[11px] leading-snug text-amber-700">Designs pause here until approved.</p>}
      </div>
    </NodeShell>
  );
};
