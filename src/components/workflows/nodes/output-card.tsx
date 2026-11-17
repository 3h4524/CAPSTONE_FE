"use client";

import Link from "next/link";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

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
const publishSummary = (
  type: string,
  config: WorkflowNodeConfig,
  t: TFunction,
  followsMockup = false
): string[] => {
  if (type === "publish-social") {
    const platforms = [config.pinterest !== false && "Pinterest", config.tiktok !== false && "TikTok"].filter(Boolean).join(" Â· ");
    const board = config.pinterest !== false && typeof config.boardName === "string" && config.boardName ? config.boardName : null;
    return [
      platforms || t("workflowEditor.outputCard.choosePlatform", { defaultValue: "Choose a platform" }),
      board
        ? t("workflowEditor.outputCard.pinsPostedTo", { defaultValue: "Pins posted to {{board}}", board })
        : t("workflowEditor.outputCard.postsByHand", { defaultValue: "Posts ready to publish by hand" }),
    ];
  }
  const etsyLine =
    config.publishToEtsy === false
      ? t("workflowEditor.outputCard.printifyOnly")
      : t("workflowEditor.outputCard.printifyPublishes");
  if (type === "publish-printify" && followsMockup) {
    const profit = typeof config.targetProfit === "number" ? config.targetProfit : 10;
    return [
      t("workflowEditor.outputCard.productSetOnMockup"),
      t("workflowEditor.outputCard.profitEach", { profit: profit.toFixed(0) }),
      etsyLine,
    ];
  }
  if (type === "publish-printify") {
    const product = typeof config.blueprintTitle === "string" ? config.blueprintTitle : null;
    const provider =
      typeof config.printProviderTitle === "string" ? config.printProviderTitle : null;
    const profit = typeof config.targetProfit === "number" ? config.targetProfit : 10;
    return [
      product ?? t("workflowEditor.outputCard.chooseProductType"),
      ...(provider ? [provider] : []),
      ...(product
        ? [
            t("workflowEditor.outputCard.variantSummary", {
              colors: count(config.colors),
              sizes: count(config.sizes),
              profit: profit.toFixed(0),
            }),
          ]
        : []),
      etsyLine,
    ];
  }
  const digital = config.listingType !== "physical";
  const price =
    typeof config.price === "number"
      ? `$${config.price.toFixed(2)}`
      : t("workflowEditor.outputCard.noPrice");
  return [
    `${digital ? t("workflowEditor.outputCard.digitalDownload") : t("workflowEditor.outputCard.physicalItem")} · ${price}`,
    typeof config.taxonomyPath === "string"
      ? config.taxonomyPath.split(" > ").slice(-1)[0]
      : t("workflowEditor.outputCard.chooseEtsyCategory"),
    t("workflowEditor.outputCard.savedAsDraft"),
  ];
};

export const OutputCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const { t } = useTranslation("common");
  const isPublish = data.type === "publish-etsy" || data.type === "publish-printify" || data.type === "publish-social";
  const definitionDescription = getWorkflowNodeDefinition(data.type)?.description;
  const description =
    definitionDescription &&
    t(`workflowEditor.nodeTypes.${data.type}.description`, { defaultValue: definitionDescription });
  // Push to Printify shows the Printify product Apply mock-up set from its templates.
  const nodes = useWorkflowStore((state) => state.nodes);
  const followsMockup =
    data.type === "publish-printify" &&
    Object.keys(
      readPrintifyProducts(nodes.find((node) => node.data.type === "apply-mockup")?.data.config)
    ).length > 0;
  const problem = isPublish
    ? nodeConfigSchemaIn(data.type, nodes).safeParse(data.config).error?.issues[0]?.message
    : undefined;
  const connections = useShopConnections({
    etsy: data.type === "publish-etsy",
    printify: data.type === "publish-printify",
  });
  const connectionIssue = publishConnectionIssue(data.type, connections);

  return (
    <NodeFrame nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-1 px-2.5 pb-2.5">
        {isPublish ? (
          <>
            {publishSummary(data.type, data.config, t, followsMockup).map((line) => (
              <p
                key={line}
                className="text-wf-faint truncate px-0.5 text-[11px] leading-4"
                title={line}
              >
                {line}
              </p>
            ))}
            {problem && (
              <p className="px-0.5 text-[10px] leading-4 text-amber-700 dark:text-amber-300">
                {problem}
              </p>
            )}
            {connectionIssue && (
              <p className="px-0.5 text-[10px] leading-4 text-amber-700 dark:text-amber-300">
                {connectionIssue.message}{" "}
                <Link
                  href={connectionIssue.href}
                  className="nodrag font-semibold underline underline-offset-2"
                >
                  {connectionIssue.linkLabel}
                </Link>
              </p>
            )}
          </>
        ) : (
          <NodeReadonlyText
            value={description}
            placeholder={t("workflowEditor.exportZip.packagesFinal")}
          />
        )}
      </div>
    </NodeFrame>
  );
};
