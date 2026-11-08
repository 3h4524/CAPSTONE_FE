"use client";

import { CheckCircle2, Download, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NodeFrame } from "@/components/workflows/nodes/node-frame";
import { getWorkflowNodeDefinition } from "@/helpers/workflow-config";
import { useMediaDownload } from "@/hooks/mutations/use-media-download";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const ExportZipCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const { run } = useWorkflowRuntime();
  const { mutate: download, isPending: isDownloading } = useMediaDownload();
  const exportStep = run?.nodes.find(
    (step) => step.nodeId === id && step.nodeType === "export-zip"
  );
  const exportId = exportStep?.output.exportId;
  const isReady =
    exportStep?.status === "succeeded" && typeof exportId === "string" && exportId.length > 0;
  const description = getWorkflowNodeDefinition(data.type)?.description;

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
                <p className="text-wf-faint text-[10px] leading-4">
                  Approved assets are packaged.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-9 w-full px-3 text-xs hover:translate-y-0"
              disabled={isDownloading}
              onClick={() =>
                download(
                  { id: exportId, zip: true },
                  { onSuccess: (url) => window.location.assign(url) }
                )
              }
            >
              {isDownloading ? (
                <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
              ) : (
                <Download aria-hidden="true" className="size-3.5" />
              )}
              {isDownloading ? "Preparing download" : "Download ZIP"}
            </Button>
          </div>
        )}
      </div>
    </NodeFrame>
  );
};
