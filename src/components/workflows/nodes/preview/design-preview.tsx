"use client";

import { useTranslation } from "react-i18next";

import { ImageGridPreview } from "@/components/workflows/nodes/preview/image-grid-preview";
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

  return (
    <ImageGridPreview
      label={t("workflowEditor.runView.previewDesigns")}
      images={simulated ?? getJobImageUrls(job)}
      status={status}
    />
  );
};
