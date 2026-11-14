"use client";

import Link from "next/link";

import { NodeFrame } from "@/components/workflows/nodes/node-frame";
import { NodeReadonlyText } from "@/components/workflows/nodes/node-readonly-text";
import { readPrintifyProducts } from "@/helpers/printify-source";
import { publishConnectionIssue } from "@/helpers/shop-connections";
import { getWorkflowNodeDefinition } from "@/helpers/workflow-config";
import { useShopConnections } from "@/hooks/queries/use-shop-connections";
import { nodeConfigSchemaIn } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode, WorkflowNodeConfig } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

const count = (value: unknown) => (Array.isArray(value) ? value.length : 0);

/** One line per setting that matters, so the canvas shows what the step will do without opening it. */
const publishSummary = (type: string, config: WorkflowNodeConfig, followsMockup = false): string[] => {
  if (type === "publish-social") {
    const platforms = [config.pinterest !== false && "Pinterest", config.tiktok !== false && "TikTok"].filter(Boolean).join(" · ");
    return [platforms || "Choose a platform", "Posts ready to publish by hand"];
  }
  if (type === "publish-printify" && followsMockup) {
    const profit = typeof config.targetProfit === "number" ? config.targetProfit : 10;
    return [
      "Product set on Apply mock-up",
      `~$${profit.toFixed(0)} profit each`,
      config.publishToEtsy === false ? "Printify only, not published to Etsy" : "Printify publishes to Etsy",
    ];
  }
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
  const isPublish = data.type === "publish-etsy" || data.type === "publish-printify" || data.type === "publish-social";
  const description = getWorkflowNodeDefinition(data.type)?.description;
  // Push to Printify shows the Printify product Apply mock-up set from its templates.
  const nodes = useWorkflowStore((state) => state.nodes);
  const followsMockup = data.type === "publish-printify" && Object.keys(readPrintifyProducts(nodes.find((node) => node.data.type === "apply-mockup")?.data.config)).length > 0;
  const problem = isPublish ? nodeConfigSchemaIn(data.type, nodes).safeParse(data.config).error?.issues[0]?.message : undefined;
  const connections = useShopConnections({ etsy: data.type === "publish-etsy", printify: data.type === "publish-printify" });
  const connectionIssue = publishConnectionIssue(data.type, connections);

  return (
    <NodeFrame nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-1 px-2.5 pb-2.5">
        {isPublish ? (
          <>
            {publishSummary(data.type, data.config, followsMockup).map((line) => (
              <p key={line} className="text-wf-faint truncate px-0.5 text-[11px] leading-4" title={line}>{line}</p>
            ))}
            {problem && <p className="px-0.5 text-[10px] leading-4 text-amber-700 dark:text-amber-300">{problem}</p>}
            {connectionIssue && (
              <p className="px-0.5 text-[10px] leading-4 text-amber-700 dark:text-amber-300">
                {connectionIssue.message}{" "}
                <Link href={connectionIssue.href} className="nodrag font-semibold underline underline-offset-2">
                  {connectionIssue.linkLabel}
                </Link>
              </p>
            )}
          </>
        ) : (
          <NodeReadonlyText value={description} placeholder="Packages the final assets." />
        )}
      </div>
    </NodeFrame>
  );
};
