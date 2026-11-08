"use client";

import { NodeFrame } from "@/components/workflows/nodes/node-frame";
import { NodeReadonlyText } from "@/components/workflows/nodes/node-readonly-text";
import { getWorkflowNodeDefinition } from "@/helpers/workflow-config";
import { workflowNodeConfigSchemas } from "@/schemas/workflow";
import type { WorkflowNode, WorkflowNodeConfig } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

const count = (value: unknown) => (Array.isArray(value) ? value.length : 0);

/** One line per setting that matters, so the canvas shows what the step will do without opening it. */
const publishSummary = (type: string, config: WorkflowNodeConfig): string[] => {
  if (type === "publish-printify") {
    const product = typeof config.blueprintTitle === "string" ? config.blueprintTitle : null;
    const provider = typeof config.printProviderTitle === "string" ? config.printProviderTitle : null;
    const profit = typeof config.targetProfit === "number" ? config.targetProfit : 10;
    return [
      product ?? "Choose a product type",
      ...(provider ? [provider] : []),
      ...(product ? [`${count(config.colors)} color(s) · ${count(config.sizes)} size(s) · ~$${profit.toFixed(0)} profit each`] : []),
      config.publishToEtsy === false ? "Printify only, not published to Etsy" : "Printify publishes to Etsy",
    ];
  }
  const digital = config.listingType !== "physical";
  const price = typeof config.price === "number" ? `$${config.price.toFixed(2)}` : "No price yet";
  return [
    `${digital ? "Digital download" : "Physical item"} · ${price}`,
    typeof config.taxonomyPath === "string" ? config.taxonomyPath.split(" > ").slice(-1)[0] : "Choose an Etsy category",
    "Saved as an Etsy draft",
  ];
};

export const OutputCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const isPublish = data.type === "publish-etsy" || data.type === "publish-printify";
  const description = getWorkflowNodeDefinition(data.type)?.description;
  const problem = isPublish ? workflowNodeConfigSchemas[data.type].safeParse(data.config).error?.issues[0]?.message : undefined;

  return (
    <NodeFrame nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-1 px-2.5 pb-2.5">
        {isPublish ? (
          <>
            {publishSummary(data.type, data.config).map((line) => (
              <p key={line} className="text-wf-faint truncate px-0.5 text-[11px] leading-4" title={line}>{line}</p>
            ))}
            {problem && <p className="px-0.5 text-[10px] leading-4 text-amber-700">{problem}</p>}
          </>
        ) : (
          <NodeReadonlyText value={description} placeholder="Packages the final assets." />
        )}
      </div>
    </NodeFrame>
  );
};
