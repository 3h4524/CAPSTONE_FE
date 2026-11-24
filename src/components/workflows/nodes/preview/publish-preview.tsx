"use client";

import { useTranslation } from "react-i18next";

import { Progress } from "@/components/ui/progress";
import { PreviewStatus } from "@/components/workflows/nodes/preview/preview-status";
import { previewToneOf, readPublishOutput } from "@/helpers/workflow-run-view";
import { useGroupPrintify } from "@/hooks/queries/use-group-printify";
import { useWorkflowRun } from "@/hooks/queries/use-workflow-run";
import { useVideoRunId } from "@/hooks/use-video-run-id";
import type { WorkflowNodeData, WorkflowNodeStatus } from "@/types/workflow";

type PublishPreviewProps = {
  nodeId: string;
  data: WorkflowNodeData;
  status: WorkflowNodeStatus;
  progress: number;
};

export const PublishPreview = ({ nodeId, data, status, progress }: PublishPreviewProps) => {
  const { t } = useTranslation("common");
  const { data: run } = useWorkflowRun(useVideoRunId());
  const groupPrintify = useGroupPrintify();
  const batch = data.type === "publish-printify" ? groupPrintify : null;
  const step = run?.nodes.find((item) => item.nodeId === nodeId);
  const output = readPublishOutput(step?.output);
  const tone = previewToneOf(status);
  const percent = Math.round(step?.progress ?? progress);
  const stage = step?.stage ?? data.stage;

  return (
    <div className="grid gap-2">
      <div className="text-wf-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
        {data.type === "publish-printify"
          ? t("workflowMedia.runStatus.pushToPrintify")
          : t("workflowMedia.runStatus.publishToEtsy")}
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
      {batch ? (
        <p className="text-wf-ink text-[11.5px] leading-snug font-semibold tabular-nums">
          {t("workflowMedia.runStatus.batchOnPrintify", { done: batch.done, total: batch.total })}
          {batch.working > 0 && (
            <span className="text-wf-faint font-normal">
              {" · "}
              {t("workflowMedia.runStatus.batchPushing", { working: batch.working })}
            </span>
          )}
          {batch.failed > 0 && (
            <span className="text-wf-fail font-normal">
              {" · "}
              {t("workflowMedia.runStatus.batchFailed", { failed: batch.failed })}
            </span>
          )}
        </p>
      ) : (
        status === "running" && (
          <div className="grid gap-1">
            <p className="text-wf-ink line-clamp-2 text-[11.5px] leading-snug font-semibold">
              {stage ?? t("workflowMedia.runStatus.running")}
            </p>
            <Progress
              value={percent}
              aria-label={t("workflowEditor.runView.previewPublishing")}
              className="bg-wf-line h-1"
              indicatorClassName="bg-wf-accent"
            />
          </div>
        )
      )}
      {status === "failed" && step?.errorMessage && (
        <p className="text-wf-fail line-clamp-3 text-[11px] leading-snug">{step.errorMessage}</p>
      )}
      {output.madeAs && (
        <p className="text-wf-dim text-[11px] leading-snug">
          {t("workflowMedia.runStatus.printifyMakes", { madeAs: output.madeAs })}
        </p>
      )}
      {status === "success" && output.etsyHost && (
        <p className="text-wf-ok truncate text-[11px] leading-snug font-semibold">
          {t("workflowMedia.runStatus.onEtsy")} · {output.etsyHost}
        </p>
      )}
      {status === "success" && output.mediaAttached > 0 && (
        <p className="text-wf-faint text-[11px] leading-snug">
          {t("workflowMedia.runStatus.mediaAttached", { attached: output.mediaAttached })}
        </p>
      )}
      {output.warnings.slice(0, 2).map((warning) => (
        <p key={warning} className="line-clamp-2 text-[10.5px] leading-snug text-amber-700 dark:text-amber-300">
          {warning}
        </p>
      ))}
    </div>
  );
};
