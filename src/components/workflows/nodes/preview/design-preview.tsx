"use client";

import { useTranslation } from "react-i18next";

import { ImageGridPreview } from "@/components/workflows/nodes/preview/image-grid-preview";
import { getJobImageUrls } from "@/helpers/workflow-run";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNodeStatus } from "@/types/workflow";

type DesignPreviewProps = {
  status: WorkflowNodeStatus;
};

export const DesignPreview = ({ status }: DesignPreviewProps) => {
  const { t } = useTranslation("common");
  const job = useWorkflowRunStore((state) => state.job);

  return (
    <ImageGridPreview label={t("workflowEditor.runView.previewDesigns")} images={getJobImageUrls(job)} status={status} />
  );
};
