"use client";
import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { confirmAiShot } from "@/helpers/confirm-ai-shot";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { useMediaDownload } from "@/hooks/mutations/use-media-download";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { generateVideoConfigSchema } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";

export const RunStatusPanel = () => {
  const { run, isError, refetch } = useWorkflowRuntime();
  const { mutate: action, isPending } = useWorkflowRunAction();
  const { mutate: download, isPending: isDownloading } = useMediaDownload();
  const active = run?.nodes.find(n => n.status === "running");
  const exportStep = run?.nodes.find(n => n.nodeType === "export-zip");
  const aiMode = useWorkflowStore(state => {
    const config = state.nodes.find(n => n.data.type === "generate-video")?.data.config;
    if (config?.mode !== "ai_shot") return false;
    const scenes = Array.isArray(config.aiScenes) ? config.aiScenes : [];
    return scenes.length === 0 || scenes.some(scene => typeof scene !== "object" || scene === null || !("mode" in scene) || scene.mode !== "standard");
  });
  const retry = async (regenerate = false) => {
    if (!run) return;
    // Only the ZIP failed: the approved video is packaged again as it is, with nothing to change or confirm.
    if (!regenerate && exportStep?.status === "failed") { action({ runId: run.id, expectedRevision: run.revision, action: "retry" }); return; }
    const videoNode = useWorkflowStore.getState().nodes.find(n => n.data.type === "generate-video");
    const parsed = generateVideoConfigSchema.safeParse(videoNode?.data.config);
    if (!parsed.success) { showToast("warning", parsed.error.issues[0]?.message ?? "Check video settings."); return; }
    try {
      const token = await confirmAiShot(run.id, parsed.data, regenerate);
      if (token === null) return;
      // The settings on the canvas go with the request: the cost just confirmed was worked out from them, and a
      // change made after the failure (another source, another motion direction) is what the retry should use.
      action({ runId: run.id, expectedRevision: run.revision, action: regenerate ? "regenerate_ai_shot" : "retry", config: parsed.data, aiShotQuoteToken: token });
    } catch (error) { showToast("error", getErrorMessage(error)); }
  };
  if (isError) return <Button type="button" variant="outline" onClick={() => refetch()}>Reload run</Button>;
  if (!run) return null;
  return <div className="space-y-3 rounded-lg border p-3" aria-live="polite"><p className="text-sm font-medium">Run: {run.status.replaceAll("_", " ")}</p><p className="text-muted-foreground text-xs">Snapshot revision {run.workflowRevision} · run r{run.revision}</p>
    {active && <><p className="text-xs">{active.stage ?? active.nodeType} · {active.progress}%</p><Progress value={active.progress} aria-label="Render progress" /></>}
    {run.errorMessage && <p className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-900" role="alert">
      <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-rose-700" aria-hidden="true" />
      <span>{run.errorMessage}</span>
    </p>}
    {run.status === "failed" && <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => retry()}>Retry checkpoint</Button>{aiMode && <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => retry(true)}>Regenerate AI clips</Button>}</div>}
    {exportStep?.status === "succeeded" && typeof exportStep.output.exportId === "string" && <Button type="button" disabled={isDownloading} onClick={() => download({ id: String(exportStep.output.exportId), zip: true }, { onSuccess: url => window.location.assign(url) })}>Download approved ZIP</Button>}
  </div>;
};
