"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  ImageGridPreview,
} from "@/components/workflows/nodes/preview/image-grid-preview";
import type { PreviewImageItem } from "@/components/workflows/nodes/preview/image-preview-modal";
import { getJobImageUrls } from "@/helpers/workflow-run";
import { useRunSimulationStore } from "@/stores/run-simulation";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNodeStatus } from "@/types/workflow";

type DesignPreviewProps = {
  status: WorkflowNodeStatus;
};

export const DesignPreview = ({ status }: DesignPreviewProps) => {
  const { t } = useTranslation("common");
  const job = useWorkflowRunStore((state) => state.job);
  const simulated = useRunSimulationStore((state) => state.images["design-image"]);

  const items = useMemo(() => {
    if (simulated) return simulated;
    if (!job) return [];

    const list: PreviewImageItem[] = [];
    job.products.forEach((product) => {
      product.images.forEach((img) => {
        list.push({
          url: img.imageUrl,
          label: product.productName
            ? `${product.productName} #${img.variationIndex + 1}`
            : `Design #${list.length + 1}`,
        });
      });
    });

    return list.length > 0 ? list : getJobImageUrls(job);
  }, [simulated, job]);

  return (
    <ImageGridPreview
      label={t("workflowEditor.runView.previewDesigns")}
      images={items}
      status={status}
    />
  );
};
