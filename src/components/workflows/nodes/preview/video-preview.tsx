"use client";

import { useTranslation } from "react-i18next";

import { PreviewStatus } from "@/components/workflows/nodes/preview/preview-status";
import { SingleVideoPreview } from "@/components/workflows/nodes/preview/single-video-preview";
import { RunGroupVideoStrip } from "@/components/workflows/nodes/run-group-video-strip";
import { previewToneOf } from "@/helpers/workflow-run-view";
import type { WorkflowNodeData, WorkflowNodeStatus } from "@/types/workflow";

type VideoPreviewProps = {
  data: WorkflowNodeData;
  status: WorkflowNodeStatus;
  progress: number;
};

export const VideoPreview = ({ data, status, progress }: VideoPreviewProps) => {
  const { t } = useTranslation("common");
  const tone = previewToneOf(status);

  return (
    <div className="grid gap-2">
      <div className="text-wf-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
        {t("workflowEditor.runView.previewVideo")}
        <PreviewStatus
          tone={tone}
          label={
            tone === "live"
              ? t("workflowEditor.runView.previewRendering")
              : tone === "failed"
                ? t("workflowEditor.runView.previewFailed")
                : t("workflowEditor.runView.previewDone")
          }
        />
      </div>
      <RunGroupVideoStrip fallback={<SingleVideoPreview data={data} status={status} progress={progress} />} />
    </div>
  );
};
