"use client";

import { CheckCircle2, Download, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { downloadRunGroupExport, getRunGroupExport } from "@/api/run-groups";
import { Button } from "@/components/ui/button";
import { NodeFrame } from "@/components/workflows/nodes/node-frame";
import { getErrorMessage } from "@/helpers/error-message";
import { showWorkflowActionToast } from "@/helpers/toast";
import { getWorkflowNodeDefinition } from "@/helpers/workflow-config";
import { useMediaDownload } from "@/hooks/mutations/use-media-download";
import { videoStatusOf } from "@/hooks/queries/use-group-videos";
import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";
import type { RunGroupTarget } from "@/types/video-workflow";
import type { WorkflowNode } from "@/types/workflow";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { NodeProps } from "@xyflow/react";

/**
 * The packages of a batch video run, one per video, downloaded as one ZIP with a folder per product. Null outside an
 * open batch video run. Keep its scope while it loads so a child's old ZIP cannot appear instead.
 */
const targetExportFinished = (target: RunGroupTarget) => {
  if (!target.runId) return false;
  // Older APIs only provide the video run's status. Current checkpoints take precedence over old packages.
  const completed = videoStatusOf(target) === "completed";
  return [target.generateVideo, target.reviewVideo, target.exportZip].every((step) =>
    step ? step.status === "succeeded" : completed
  );
};

const useGroupExport = (runGroupId?: string | null) => {
  const urlGroupId = useRunGroupId();
  const groupId = urlGroupId ?? runGroupId ?? null;
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const { data: group } = useRunGroup(groupId);
  const active =
    group && group.id === groupId && group.workflowId === workflowId && group.status !== "waiting_for_targets"
      ? group
      : null;
  // Each step change refreshes the summary, including exports that finish while publishing continues.
  const { t } = useTranslation("common");
  const finished = active?.targets.map((target) =>
    `${target.runId}:${videoStatusOf(target)}:${target.generateVideo?.status}:${target.reviewVideo?.status}:${target.exportZip?.status}`
  ).join("|") ?? "";
  const { data: summary } = useQuery({
    // Not under the group's own key: reading the group again (every change of a run) must not ask this too.
    queryKey: ["run-group-export", active?.id ?? null, finished],
    queryFn: () => getRunGroupExport(active!.id),
    enabled: Boolean(active),
  });
  const { mutate: download, isPending } = useMutation({
    mutationFn: () => downloadRunGroupExport(active!.id),
    onSuccess: (url) => window.location.assign(url),
    onError: (error) =>
      showWorkflowActionToast(
        "error",
        `${t("workflowEditor.exportZip.downloadFailed")} ${getErrorMessage(error)}`
      ),
  });
  const ready = Boolean(active && active.status !== "cancelled" && active.targets.length > 0 &&
    active.targets.every(targetExportFinished) && summary?.groupId === active.id &&
    summary.videos === active.targets.length && summary.ready === summary.videos);
  return groupId ? { summary, ready, runIds: active?.targets.map((target) => target.runId) ?? [], download, isPending } : null;
};

export const ExportZipCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const { t } = useTranslation("common");
  const { run } = useWorkflowRuntime();
  const { mutate: download, isPending: isDownloading } = useMediaDownload();
  const groupExport = useGroupExport(run?.runGroupId);
  const exportStep = run?.nodes.find(
    (step) => step.nodeId === id && step.nodeType === "export-zip"
  );
  const exportId = exportStep?.output.exportId;
  const definitionDescription = getWorkflowNodeDefinition(data.type)?.description;
  const description =
    definitionDescription &&
    t(`workflowEditor.nodeTypes.${data.type}.description`, { defaultValue: definitionDescription });

  // A batch video run downloads every video's package together; a single video run, its own.
  const summary = groupExport?.summary;
  const runFinished = ["generate-video", "review-video"].every((type) =>
    run?.nodes.find((step) => step.nodeType === type)?.status === "succeeded"
  ) && exportStep?.status === "succeeded";
  const isReady = groupExport
    ? groupExport.ready && (!run || !groupExport.runIds.includes(run.id) || runFinished)
    : runFinished && typeof exportId === "string" && exportId.length > 0;
  const isPending = groupExport ? groupExport.isPending : isDownloading;
  const caption = !groupExport
    ? t("workflowEditor.exportZip.assetsPackaged")
    : summary && summary.ready < summary.videos
      ? t("workflowEditor.exportZip.somePackaged", { ready: summary.ready, total: summary.videos })
      : t("workflowEditor.exportZip.allPackaged", { count: summary?.ready ?? 0 });
  const startDownload = () => {
    if (!isReady) return;
    if (groupExport) {
      groupExport.download();
      return;
    }
    if (typeof exportId === "string")
      download({ id: exportId, zip: true }, { onSuccess: (url) => window.location.assign(url) });
  };

  return (
    <NodeFrame nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-2 px-2.5 pb-2.5">
        <p className="text-wf-dim px-0.5 text-[11px] leading-4">
          {description || t("workflowEditor.exportZip.packagesFinal")}
        </p>
        {isReady && (
          <div className="border-wf-line space-y-2 border-t pt-2">
            <div className="flex items-center gap-2">
              <CheckCircle2
                aria-hidden="true"
                className="text-wf-ok size-4 shrink-0"
                strokeWidth={2}
              />
              <div className="min-w-0">
                <p className="text-wf-strong text-xs leading-4 font-semibold">
                  {t("workflowEditor.exportZip.zipReady")}
                </p>
                <p className="text-wf-faint text-[10px] leading-4">{caption}</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-9 w-full px-3 text-xs hover:translate-y-0"
              disabled={isPending}
              onClick={startDownload}
            >
              {isPending ? (
                <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
              ) : (
                <Download aria-hidden="true" className="size-3.5" />
              )}
              {isPending
                ? t("workflowEditor.exportZip.preparing")
                : t("workflowEditor.exportZip.download")}
            </Button>
          </div>
        )}
      </div>
    </NodeFrame>
  );
};
