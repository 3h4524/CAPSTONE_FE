"use client";

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
  const batchId = useWorkflowStore((state) =>
    readString(state.nodes.find((node) => node.data.type === "product-input")?.data.config.batchId)
  );
  const { data: products } = useBatchProducts(batchId);
  if (!products) return null;

  const own = ownPromptProducts(products);
  if (own.length === 0) return null;

  const pending = products.filter(isPending).length;
  const one = own.length === 1;
  const names = own.slice(0, NAMES_SHOWN).map((product) => product.name).join(", ");
  const more = own.length - NAMES_SHOWN;

  return (
    <PanelNotice tone="warning" className={className}>
      {own.length} of {pending} product{pending === 1 ? "" : "s"} to run {one ? "has its" : "have their"} own image
      prompt: {names}
      {more > 0 && ` and ${more} more`}. The design template and art style chosen here don&apos;t apply to{" "}
      {one ? "it" : "them"}: {one ? "its" : "their"} prompt sets the image. To use the template, clear the image prompt
      when you edit the product in Batches.
    </PanelNotice>
  );
};
