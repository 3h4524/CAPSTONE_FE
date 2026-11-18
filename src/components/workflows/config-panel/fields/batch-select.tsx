"use client";

import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { productLineRatios } from "@/constants/batches";
import { productLineName } from "@/helpers/product-lines";
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
  const { t } = useTranslation("common");
  const { data: batches, isPending, isError, refetch } = useBatches();
  const { data: products } = useBatchProducts(value);
  const options = (batches ?? []).map((batch) => ({
    value: batch.id,
    label: batch.name,
    hint: `${batch.productLine ? `${productLineName(batch.productLine)} · ` : ""}${t("workflowConfig.fields.productCount", { count: batch.productCount })}${batch.defaultNiche ? ` · ${batch.defaultNiche}` : ""}`,
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
        emptyMessage={t("workflowConfig.fields.noBatches")}
      />
      {chosen && !chosen.productLine && (
        <PanelNotice tone="warning">{t("workflowConfig.fields.batchWithoutLine")}</PanelNotice>
      )}
      {/* The count itself is in the strip at the top of the panel; only an empty batch needs saying here. */}
      {value && pendingCount === 0 && (
        <PanelNotice tone="warning">{t("workflowConfig.fields.noPendingProducts")}</PanelNotice>
      )}
      {/* A new tab keeps this workflow's unsaved edits; the batch list refreshes when this tab is focused again. */}
      <Button asChild type="button" variant="link" size="sm" className="h-auto gap-1 px-0 text-xs font-medium hover:translate-y-0">
        <a href="/batches" target="_blank" rel="noreferrer">
          {t("workflowConfig.fields.manageBatches")}
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </Button>
    </div>
  );
};
