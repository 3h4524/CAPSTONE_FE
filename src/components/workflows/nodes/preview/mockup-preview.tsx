"use client";

import { useTranslation } from "react-i18next";

import { ImageGridPreview } from "@/components/workflows/nodes/preview/image-grid-preview";
import { getMockupImageUrls } from "@/helpers/workflow-run";
import { useRunSimulationStore } from "@/stores/run-simulation";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNodeStatus } from "@/types/workflow";

type MockupPreviewProps = {
  status: WorkflowNodeStatus;
};

export const MockupPreview = ({ status }: MockupPreviewProps) => {
  const { t } = useTranslation("common");
  const mockupResult = useWorkflowRunStore((state) => state.mockupResult);
  const simulated = useRunSimulationStore((state) => state.images["apply-mockup"]);

  return (
    <ImageGridPreview
      label={t("workflowEditor.runView.previewMockups")}
      images={simulated ?? getMockupImageUrls(mockupResult)}
      status={status}
    />
  );
};
