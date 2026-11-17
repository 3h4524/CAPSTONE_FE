"use client";

import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { readString } from "@/helpers/workflow-config";
import { toProductOptions } from "@/helpers/workflow-panel";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useWorkflowStore } from "@/stores/workflow";

const FIELD_ID = "video-product";

// The product of a video whose settings fit one product only, chosen where the video part starts. It is stored in
// Product input's config (the run takes it from there when it starts), but shown only here.
export const VideoProductSelect = () => {
  const { t } = useTranslation("common");
  const input = useWorkflowStore((state) => state.nodes.find((node) => node.data.type === "product-input"));
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const batchId = readString(input?.data.config.batchId);
  const { data: products, isPending, isError, refetch } = useBatchProducts(batchId);
  if (!input) return null;

  return (
    <div className="space-y-2">
      <Label htmlFor={FIELD_ID}>{t("workflowConfig.fields.productForVideo")}</Label>
      {batchId ? (
        <OptionSelect
          standaloneId={FIELD_ID}
          value={readString(input.data.config.productId)}
          options={toProductOptions(products)}
          placeholder={t("workflowConfig.fields.chooseOneProduct")}
          clearable
          onChange={(productId) => updateNodeConfig(input.id, { ...input.data.config, productId })}
          isLoading={isPending}
          isError={isError}
          onRetry={() => refetch()}
          disabled={isRunning}
          emptyMessage={t("workflowConfig.fields.batchHasNoProducts")}
        />
      ) : (
        <PanelNotice tone="warning">{t("workflowConfig.fields.chooseBatchFirst")}</PanelNotice>
      )}
      <p className="text-muted-foreground text-xs leading-relaxed">
        {isRunning ? t("workflowConfig.fields.runKeepsProduct") : t("workflowConfig.fields.videoForThisProduct")}
      </p>
    </div>
  );
};
