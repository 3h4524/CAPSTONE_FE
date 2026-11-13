"use client";

import { CheckCircle2, Download, LoaderCircle } from "lucide-react";

import { downloadRunGroupExport, getRunGroupExport } from "@/api/run-groups";
import { Button } from "@/components/ui/button";
import { NodeFrame } from "@/components/workflows/nodes/node-frame";
import { getErrorMessage } from "@/helpers/error-message";
import { showWorkflowActionToast } from "@/helpers/toast";
import { getWorkflowNodeDefinition } from "@/helpers/workflow-config";
import { useMediaDownload } from "@/hooks/mutations/use-media-download";
import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode } from "@/types/workflow";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { NodeProps } from "@xyflow/react";

/**
 * The packages of a batch video run, one per video, downloaded as one ZIP with a folder per product. Null outside an
 * open batch video run whose videos have started.
 */
const useGroupExport = () => {
  const groupId = useRunGroupId();
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const { data: group } = useRunGroup(groupId);
  const active = group && group.workflowId === workflowId && group.status !== "waiting_for_targets" ? group : null;
  // Asked again as videos finish, since each one's package is made when its run completes.
  const finished = active?.targets.filter((target) => target.runStatus === "completed").length ?? 0;
  const { data: summary } = useQuery({
    // Not under the group's own key: reading the group again (every change of a run) must not ask this too.
    queryKey: ["run-group-export", active?.id ?? null, finished],
    queryFn: () => getRunGroupExport(active!.id),
    enabled: Boolean(active),
  });
  const { mutate: download, isPending } = useMutation({
    mutationFn: () => downloadRunGroupExport(active!.id),
    onSuccess: (url) => window.location.assign(url),
    onError: (error) => showWorkflowActionToast("error", `The ZIP could not be downloaded. ${getErrorMessage(error)}`),
  });
  return active ? { summary, download, isPending } : null;
};

export const ExportZipCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const { run } = useWorkflowRuntime();
  const { mutate: download, isPending: isDownloading } = useMediaDownload();
  const groupExport = useGroupExport();
  const exportStep = run?.nodes.find(
    (step) => step.nodeId === id && step.nodeType === "export-zip"
  );
  const exportId = exportStep?.output.exportId;
  const description = getWorkflowNodeDefinition(data.type)?.description;

  // A batch video run downloads every video's package together; a single video run, its own.
  const summary = groupExport?.summary;
  const isReady = groupExport
    ? Boolean(summary && summary.ready > 0)
    : exportStep?.status === "succeeded" && typeof exportId === "string" && exportId.length > 0;
  const isPending = groupExport ? groupExport.isPending : isDownloading;
  const caption = !groupExport
    ? "Approved assets are packaged."
    : summary && summary.ready < summary.videos
      ? `${summary.ready} of ${summary.videos} videos are packaged.`
      : `All ${summary?.ready ?? 0} videos are packaged, a folder per product.`;
  const startDownload = () => {
    if (groupExport) {
      groupExport.download();
      return;
    }
    if (typeof exportId === "string") download({ id: exportId, zip: true }, { onSuccess: (url) => window.location.assign(url) });
  };

  return (
    <NodeFrame nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-2 px-2.5 pb-2.5">
        <p className="text-wf-dim px-0.5 text-[11px] leading-4">
          {description || "Packages the final assets."}
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
                <p className="text-wf-strong text-xs leading-4 font-semibold">ZIP ready</p>
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
              {isPending ? "Preparing download" : "Download ZIP"}
            </Button>
          </div>
        )}
      </div>
    </NodeFrame>
  );
};
