"use client";

import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { PreviousRunsSelect } from "@/components/workflows/config-panel/fields/previous-runs-select";
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
    label: `${batch.name} · ${batch.productCount} products`,
  }));
  // A run only generates for pending products, so say how many this batch has before the user runs.
  const pendingCount = products?.filter((product) => product.status === "pending").length;

  return (
    <div className="space-y-2">
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
      {value && pendingCount !== undefined && (
        <p className={pendingCount === 0 ? "text-xs text-amber-700" : "text-muted-foreground text-xs"}>
          {pendingCount === 0
            ? "This batch has no pending products. Add some on the Batches page before running."
            : `${pendingCount} pending ${pendingCount === 1 ? "product" : "products"} will be generated.`}
        </p>
      )}
      <PreviousRunsSelect batchId={value} />
      {/* A new tab keeps this workflow's unsaved edits; the batch list refreshes when this tab is focused again. */}
      <Button asChild type="button" variant="outline" size="sm" className="w-full">
        <a href="/batches" target="_blank" rel="noreferrer">
          <ExternalLink aria-hidden="true" />
          Create or manage batches
        </a>
      </Button>
    </div>
  );
};
