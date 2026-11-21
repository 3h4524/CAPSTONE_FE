"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import { PreviewStatus } from "@/components/workflows/nodes/preview/preview-status";
import { getJobImageUrls } from "@/helpers/workflow-run";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNodeStatus } from "@/types/workflow";

const PREVIEW_TILES = 4;

type DesignPreviewProps = {
  status: WorkflowNodeStatus;
};

export const DesignPreview = ({ status }: DesignPreviewProps) => {
  const { t } = useTranslation("common");
  const job = useWorkflowRunStore((state) => state.job);
  const images = getJobImageUrls(job);
  const shown = images.slice(-PREVIEW_TILES);
  const placeholders = status === "running" ? Math.max(0, PREVIEW_TILES - shown.length) : 0;
  if (shown.length === 0 && placeholders === 0) return null;

  return (
    <div className="grid gap-2">
      <div className="text-wf-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
        {t("workflowEditor.runView.previewDesigns")}
        <span className="text-wf-faint tabular-nums">{images.length}</span>
        <PreviewStatus
          tone={status === "running" ? "live" : status === "failed" ? "failed" : "done"}
          label={
            status === "running"
              ? t("workflowEditor.runView.previewLive")
              : status === "failed"
                ? t("workflowEditor.runView.previewFailed")
                : t("workflowEditor.runView.previewDone")
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {shown.map((url) => (
          <div
            key={url}
            className="border-wf-line animate-in fade-in zoom-in-95 relative aspect-square overflow-hidden rounded-md border duration-500"
          >
            <Image src={url} alt="" fill sizes="120px" unoptimized className="object-cover" />
          </div>
        ))}
        {Array.from({ length: placeholders }, (_, index) => (
          <Skeleton key={index} className="aspect-square rounded-md" />
        ))}
      </div>
    </div>
  );
};
