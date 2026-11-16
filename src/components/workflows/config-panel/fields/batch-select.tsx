"use client";

import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { productLineLabels, productLineRatios } from "@/constants/batches";
import { readString } from "@/helpers/workflow-config";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useBatches } from "@/hooks/queries/use-batches";
import { useWorkflowStore } from "@/stores/workflow";

type BatchSelectProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

export const BatchSelect = ({ value, placeholder, onChange }: BatchSelectProps) => {
  const { data: batches, isPending, isError, refetch } = useBatches();
  const { data: products } = useBatchProducts(value);
  const options = (batches ?? []).map((batch) => ({
    value: batch.id,
    label: batch.name,
    hint: `${batch.productLine ? `${productLineLabels[batch.productLine]} · ` : ""}${batch.productCount} ${batch.productCount === 1 ? "product" : "products"}${batch.defaultNiche ? ` · ${batch.defaultNiche}` : ""}`,
  }));
  // A run only generates for pending products, so a batch without any is pointed out before the user runs.
  const pendingCount = products?.filter((product) => product.status === "pending").length;
  const chosen = batches?.find((batch) => batch.id === value);

  // The design ratio follows the batch: one that does not suit its product line's print area becomes the line's own.
  const choose = (batchId: string) => {
    onChange(batchId);
    const line = batches?.find((batch) => batch.id === batchId)?.productLine;
    if (!line) return;
    const { nodes, updateNodeConfig } = useWorkflowStore.getState();
    const design = nodes.find((node) => node.data.type === "design-image");
    const { ratios } = productLineRatios[line];
    if (design && !ratios.includes(readString(design.data.config.aspectRatio))) {
      updateNodeConfig(design.id, { ...design.data.config, aspectRatio: ratios[0] });
    }
  };

  return (
    <div className="min-w-0 space-y-2">
      <OptionSelect
        value={value}
        options={options}
        placeholder={placeholder}
        onChange={choose}
        isLoading={isPending}
        isError={isError}
        onRetry={() => refetch()}
        emptyMessage="No batches yet. Create one on the Batches page, then choose it here."
      />
      {chosen && !chosen.productLine && (
        <PanelNotice tone="warning">This batch has no product line yet. Choose one on the Batches page before running it.</PanelNotice>
      )}
      {/* The count itself is in the strip at the top of the panel; only an empty batch needs saying here. */}
      {value && pendingCount === 0 && (
        <PanelNotice tone="warning">This batch has no pending products. Add some on the Batches page before running.</PanelNotice>
      )}
      {/* A new tab keeps this workflow's unsaved edits; the batch list refreshes when this tab is focused again. */}
      <Button asChild type="button" variant="link" size="sm" className="h-auto gap-1 px-0 text-xs font-medium hover:translate-y-0">
        <a href="/batches" target="_blank" rel="noreferrer">
          Create or manage batches
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </Button>
    </div>
  );
};
