"use client";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { readString } from "@/helpers/workflow-config";
import { toProductOptions } from "@/helpers/workflow-panel";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import type { WorkflowNodeConfig } from "@/types/workflow";

export const ProductSelect = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const { t } = useTranslation("common");
  const { control } = useFormContext<WorkflowNodeConfig>();
  const batchId = readString(useWatch({ control, name: "batchId" }));
  const { data: products, isPending, isError, refetch } = useBatchProducts(batchId);
  // The product is only needed for a video, so a choice can be taken back.
  return <OptionSelect value={value} onChange={onChange} options={toProductOptions(products)} placeholder={t("workflowConfig.fields.chooseOneProduct")} clearable isLoading={Boolean(batchId) && isPending} isError={isError} onRetry={() => refetch()} emptyMessage={t("workflowConfig.fields.chooseBatchWithProduct")} />;
};
