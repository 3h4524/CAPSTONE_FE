"use client";

import { ImagePlus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { showToast } from "@/helpers/toast";
import { readString } from "@/helpers/workflow-config";
import { useImportGeneratedMockups } from "@/hooks/mutations/use-import-generated-mockups";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { BatchJobProductResult } from "@/types/batch-jobs";

const NO_PRODUCTS: BatchJobProductResult[] = [];

// Sits above the list of mock-ups a video can use. The mock-ups made by Apply mock-up are not in that list
// until they are stored as images, which this does for the product the video is for.
export const VideoSourcesHeader = () => {
  const { t } = useTranslation("common");
  const configuredProductId = useWorkflowStore((state) =>
    readString(state.nodes.find((node) => node.data.type === "product-input")?.data.config.productId)
  );
  const { run } = useWorkflowRuntime();
  const productId = run?.productId ?? configuredProductId;
  // The open batch job may have made its mock-ups for other products than the one the video is for.
  const otherJobProducts = useWorkflowRunStore((state) => {
    const products = state.job?.products;
    return !products || products.some((product) => product.productId === productId) ? NO_PRODUCTS : products;
  });
  const { mutate: importMockups, isPending } = useImportGeneratedMockups();

  const addGenerated = (id: string) =>
    importMockups(id, {
      onSuccess: ({ importedCount, failedCount, mockups }) => {
        if (failedCount > 0) showToast("warning", t("workflowMedia.videoSources.addFailed", { count: failedCount }));
        else if (importedCount > 0) showToast("success", t("workflowMedia.videoSources.added", { count: importedCount }));
        else if (mockups.length === 0) showToast("info", t("workflowMedia.videoSources.noMockups"));
        else showToast("info", t("workflowMedia.videoSources.alreadyListed"));
      },
    });

  // Makes the video for a product of the open job, whose mock-ups were just made, and adds them to the list.
  // The video run is made from the saved workflow, so the change is saved before Run.
  const chooseForVideo = (id: string, name: string) => {
    const input = useWorkflowStore.getState().nodes.find((node) => node.data.type === "product-input");
    if (!input) return;
    useWorkflowStore.getState().updateNodeConfig(input.id, { ...input.data.config, productId: id });
    addGenerated(id);
    showToast("info", t("workflowMedia.videoSources.productSwitched", { name }));
  };

  if (!productId) return null;

  return (
    <div className="space-y-2">
      {otherJobProducts.length > 0 && (
        <PanelNotice
          tone="warning"
          action={
            // A started video run keeps its product, so the switch is offered only before the video part starts.
            !run && (
              <div className="flex flex-wrap gap-2">
                {otherJobProducts.map((product) =>
                  product.productId ? (
                    <Button key={product.id} type="button" size="sm" variant="outline" className="bg-card h-7 px-3 text-xs hover:translate-y-0" disabled={isPending} onClick={() => chooseForVideo(product.productId!, product.productName)}>
                      {t("workflowMedia.videoSources.useProduct", { name: product.productName })}
                    </Button>
                  ) : null
                )}
              </div>
            )
          }
        >
          {t(run ? "workflowMedia.videoSources.otherProductsRunning" : "workflowMedia.videoSources.otherProducts", { names: otherJobProducts.map((product) => product.productName).join(", ") })}
        </PanelNotice>
      )}
      <Button type="button" variant="outline" size="sm" className="w-full hover:translate-y-0" disabled={isPending} onClick={() => addGenerated(productId)}>
        <ImagePlus aria-hidden="true" />
        {isPending ? t("workflowMedia.videoSources.adding") : t("workflowMedia.videoSources.addThisProduct")}
      </Button>
    </div>
  );
};
