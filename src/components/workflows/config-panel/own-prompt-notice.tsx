"use client";

import { useTranslation } from "react-i18next";

import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { readString } from "@/helpers/workflow-config";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useWorkflowStore } from "@/stores/workflow";
import type { Product } from "@/types/batches";

const NAMES_SHOWN = 3;

const isPending = (product: Product) => product.status === "pending";

/** The products a run makes designs for (the batch's pending ones) that have their own image prompt. */
export const ownPromptProducts = (products: Product[]) =>
  products.filter((product) => isPending(product) && Boolean(product.customPrompt?.trim()));

// A product's own image prompt replaces the design template and the art style chosen here, so the Seller is told which
// products those are before the run, rather than finding a design that ignores the template.
export const OwnPromptNotice = ({ className }: { className?: string }) => {
  const { t } = useTranslation("common");
  const batchId = useWorkflowStore((state) =>
    readString(state.nodes.find((node) => node.data.type === "product-input")?.data.config.batchId)
  );
  const { data: products } = useBatchProducts(batchId);
  if (!products) return null;

  const own = ownPromptProducts(products);
  if (own.length === 0) return null;

  const pending = products.filter(isPending).length;
  const names = own.slice(0, NAMES_SHOWN).map((product) => product.name).join(", ");
  const more = own.length - NAMES_SHOWN;

  return (
    <PanelNotice tone="warning" className={className}>
      {t("workflowConfig.ownPrompt.lead", { count: pending, own: own.length })}{" "}
      {t("workflowConfig.ownPrompt.names", { count: own.length, names })}
      {more > 0 && t("workflowConfig.ownPrompt.more", { count: more })}
      {t("workflowConfig.ownPrompt.tail", { count: own.length })}
    </PanelNotice>
  );
};
