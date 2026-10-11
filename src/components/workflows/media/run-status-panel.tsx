"use client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMediaDownload } from "@/hooks/mutations/use-media-download";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";

export const RunStatusPanel = () => {
  const { run, isError, refetch } = useWorkflowRuntime();
  const { mutate: action, isPending } = useWorkflowRunAction();
  const { mutate: download, isPending: isDownloading } = useMediaDownload();
  const active = run?.nodes.find(n => n.status === "running");
  const exportStep = run?.nodes.find(n => n.nodeType === "export-zip");
  if (isError) return <Button type="button" variant="outline" onClick={() => refetch()}>Reload run</Button>;
  if (!run) return null;
  return <div className="space-y-3 rounded-lg border p-3" aria-live="polite"><p className="text-sm font-medium">Run: {run.status.replaceAll("_", " ")}</p><p className="text-muted-foreground text-xs">Snapshot revision {run.workflowRevision} · run r{run.revision}</p>
    {active && <><p className="text-xs">{active.stage ?? active.nodeType} · {active.progress}%</p><Progress value={active.progress} aria-label="Render progress" /></>}
    {run.errorMessage && <p className="text-destructive text-xs" role="alert">{run.errorMessage}</p>}
    {run.status === "failed" && <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => action({ runId: run.id, expectedRevision: run.revision, action: "retry" })}>Retry checkpoint</Button>}
    {exportStep?.status === "succeeded" && typeof exportStep.output.exportId === "string" && <Button type="button" disabled={isDownloading} onClick={() => download({ id: String(exportStep.output.exportId), zip: true }, { onSuccess: url => window.location.assign(url) })}>Download approved ZIP</Button>}
  </div>;
};
