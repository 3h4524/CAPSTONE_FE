"use client";

import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { useBatches } from "@/hooks/queries/use-batches";

type BatchSelectProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

export const BatchSelect = ({ value, placeholder, onChange }: BatchSelectProps) => {
  const { data: batches, isPending, isError, refetch } = useBatches();
  const options = (batches ?? []).map((batch) => ({
    value: batch.id,
    label: `${batch.name} · ${batch.productCount} products`,
  }));

  return (
    <OptionSelect
      value={value}
      options={options}
      placeholder={placeholder}
      onChange={onChange}
      isLoading={isPending}
      isError={isError}
      onRetry={() => refetch()}
      emptyMessage="Create a batch first to feed products into this workflow."
    />
  );
};
