"use client";

import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useBatches } from "@/hooks/queries/use-batches";

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
    hint: `${batch.productCount} ${batch.productCount === 1 ? "product" : "products"}${batch.defaultNiche ? ` · ${batch.defaultNiche}` : ""}`,
  }));
  // A run only generates for pending products, so a batch without any is pointed out before the user runs.
  const pendingCount = products?.filter((product) => product.status === "pending").length;

  return (
    <div className="min-w-0 space-y-2">
      <OptionSelect
        value={value}
        options={options}
        placeholder={placeholder}
        onChange={onChange}
        isLoading={isPending}
        isError={isError}
        onRetry={() => refetch()}
        emptyMessage="No batches yet. Create one on the Batches page, then choose it here."
      />
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
