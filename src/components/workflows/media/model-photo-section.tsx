"use client";

import { PackageSearch } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PanelEmptyState } from "@/components/workflows/config-panel/layout/panel-empty-state";
import { lifestyleGarmentsOf, LifestyleMockupForm } from "@/components/workflows/media/lifestyle-mockup-form";
import { MockupCard } from "@/components/workflows/media/mockup-card";
import { ModelPhotoMockupForm } from "@/components/workflows/media/model-photo-mockup-form";
import { readString } from "@/helpers/workflow-config";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { usePrintWithoutAi } from "@/hooks/queries/use-print-without-ai";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";

/**
 * Model photos for a workflow without a video: the form that puts the product's mock-ups on one, and the images it
 * made. A workflow with a video has the same form in its mock-up list. While that is only done with AI, its form
 * shows the images it made itself.
 */
export const ModelPhotoSection = () => {
  const { t } = useTranslation("common");
  const printWithoutAi = usePrintWithoutAi();
  const configuredProductId = useWorkflowStore((state) =>
    readString(
      state.nodes.find((node) => node.data.type === "product-input")?.data.config.productId
    )
  );
  const { run } = useWorkflowRuntime();
  const productId = run?.productId ?? configuredProductId;
  const { data: assets } = useMockupAssets(productId);

  if (!productId)
    return (
      <PanelEmptyState
        icon={PackageSearch}
        title={t("workflowMedia.modelPhotoSection.emptyTitle")}
        description={t("workflowMedia.modelPhotoSection.emptyDescription")}
      />
    );

  if (!printWithoutAi)
    return (
      <div className="@container">
        <LifestyleMockupForm garments={lifestyleGarmentsOf(assets ?? [])} />
      </div>
    );

  const made = (assets ?? []).filter(
    (asset) => asset.role === "Lifestyle" && asset.sourceType === "generated"
  );
  return (
    <div className="@container space-y-3">
      <ModelPhotoMockupForm productId={productId} assets={assets ?? []} />
      {made.length > 0 && (
        <div className="grid gap-3 @md:grid-cols-2">
          {made.map((asset) => (
            <MockupCard
              key={asset.id}
              asset={asset}
              review={false}
              selectable={false}
              selected={false}
              onSelect={() => undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};
