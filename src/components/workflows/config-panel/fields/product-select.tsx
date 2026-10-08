"use client";
import { useFormContext, useWatch } from "react-hook-form";

import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { readString } from "@/helpers/workflow-config";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import type { WorkflowNodeConfig } from "@/types/workflow";

export const ProductSelect = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const { control } = useFormContext<WorkflowNodeConfig>();
  const batchId = readString(useWatch({ control, name: "batchId" }));
  const { data: products, isPending, isError, refetch } = useBatchProducts(batchId);
  return <OptionSelect value={value} onChange={onChange} options={(products ?? []).map(p => ({ value: p.id, label: `${p.name} · ${p.productType}` }))} placeholder="Choose one product" isLoading={Boolean(batchId) && isPending} isError={isError} onRetry={() => refetch()} emptyMessage="Choose a batch containing a product first." />;
};
