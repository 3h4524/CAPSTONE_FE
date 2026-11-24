"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import { PreviewStatus } from "@/components/workflows/nodes/preview/preview-status";
import { RUN_PREVIEW_TILES } from "@/constants/workflow-run-effects";
import { previewToneOf } from "@/helpers/workflow-run-view";
import type { WorkflowNodeStatus } from "@/types/workflow";

type ImageGridPreviewProps = {
  label: string;
  images: string[];
  status: WorkflowNodeStatus;
};

export const ImageGridPreview = ({ label, images, status }: ImageGridPreviewProps) => {
  const { t } = useTranslation("common");
  const shown = images.slice(-RUN_PREVIEW_TILES);
  const placeholders = status === "running" ? Math.max(0, RUN_PREVIEW_TILES - shown.length) : 0;
  if (shown.length === 0 && placeholders === 0) return null;
  const tone = previewToneOf(status);

  return (
    <div className="grid gap-2">
      <div className="text-wf-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
        {label}
        <span className="text-wf-faint tabular-nums">{images.length}</span>
        <PreviewStatus
          tone={tone}
          label={
            tone === "live"
              ? t("workflowEditor.runView.previewLive")
              : tone === "failed"
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
          <Skeleton key={index} className="bg-wf-line/70 aspect-square rounded-md" />
        ))}
      </div>
    </div>
  );
};
