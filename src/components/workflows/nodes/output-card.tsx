"use client";

import { NodeCheck } from "@/components/workflows/nodes/node-check";
import { NodeFrame } from "@/components/workflows/nodes/node-frame";
import { NodeReadonlyText } from "@/components/workflows/nodes/node-readonly-text";
import { getWorkflowNodeDefinition, readBoolean } from "@/helpers/workflow-config";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const OutputCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const publishImmediately = readBoolean(data.config.publishImmediately);
  const isPublish = data.type === "publish-etsy" || data.type === "publish-printify";
  const description = getWorkflowNodeDefinition(data.type)?.description;

  return (
    <NodeFrame nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-1.5 px-2.5 pb-2.5">
        {isPublish ? (
          <>
            <NodeCheck label="Publish immediately" checked={publishImmediately} />
            <p className="text-wf-faint px-0.5 text-[10px] leading-4">
              {publishImmediately
                ? "Listings go live as soon as the run finishes."
                : "Listings are saved as drafts."}
            </p>
          </>
        ) : (
          <NodeReadonlyText value={description} placeholder="Packages the final assets." />
        )}
      </div>
    </NodeFrame>
  );
};
