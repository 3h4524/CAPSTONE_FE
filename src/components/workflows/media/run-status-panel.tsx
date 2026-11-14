"use client";
import { useState } from "react";
import { CircleAlert, ExternalLink, Share2 } from "lucide-react";

import { EtsyPublishDialog } from "@/components/shop/etsy-publish-dialog";
import { PrintifyPublishDialog } from "@/components/shop/printify-publish-dialog";
import { SocialShareDialog } from "@/components/shop/social-share-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PUBLISH_NODE_TYPES } from "@/constants/workflow";
import { confirmAiShot } from "@/helpers/confirm-ai-shot";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { generateVideoConfigSchema } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNodeRun } from "@/types/video-workflow";

export const RunStatusPanel = () => {
  const { run, isError, refetch } = useWorkflowRuntime();
  const { mutate: action, isPending } = useWorkflowRunAction();
  const [publishing, setPublishing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const active = run?.nodes.find(n => n.status === "running");
  const exportStep = run?.nodes.find(n => n.nodeType === "export-zip");
  const aiMode = useWorkflowStore(state => {
    const config = state.nodes.find(n => n.data.type === "generate-video")?.data.config;
    if (config?.mode !== "ai_shot") return false;
    const scenes = Array.isArray(config.aiScenes) ? config.aiScenes : [];
    return scenes.length === 0 || scenes.some(scene => typeof scene !== "object" || scene === null || !("mode" in scene) || scene.mode !== "standard");
  });
  const publishSteps = run?.nodes.filter(n => PUBLISH_NODE_TYPES.includes(n.nodeType as (typeof PUBLISH_NODE_TYPES)[number])) ?? [];
  // The approved product can be pushed by hand once the run made it: its ZIP is ready, or the run is done.
  const madeIt = exportStep?.status === "succeeded" || run?.status === "completed";
  const retry = async (regenerate = false) => {
    if (!run) return;
    // Only the ZIP or a publish step failed: it runs again from the approved package, with nothing to change or confirm.
    if (!regenerate && (exportStep?.status === "failed" || publishSteps.some(step => step.status === "failed"))) { action({ runId: run.id, expectedRevision: run.revision, action: "retry" }); return; }
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
    {run.errorMessage && <p className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" role="alert">
      <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-rose-700 dark:text-rose-300" aria-hidden="true" />
      <span>{run.errorMessage}</span>
    </p>}
    {run.status === "failed" && <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => retry()}>Retry checkpoint</Button>{aiMode && <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => retry(true)}>Regenerate AI clips</Button>}</div>}
    {madeIt && (
      <div className="flex flex-wrap gap-2">
        {/* Print-on-demand: Printify makes the item and publishes it to Etsy, linked so orders reach it. */}
        <Button type="button" variant="outline" onClick={() => setPrinting(true)}>Push to Printify</Button>
        {/* A listing sent straight to Etsy has no print provider: meant for digital downloads. */}
        <Button type="button" variant="outline" onClick={() => setPublishing(true)}>Push to Etsy</Button>
        {/* Posts for Pinterest and TikTok from the same approved media, to publish by hand. */}
        <Button type="button" variant="outline" onClick={() => setSharing(true)}><Share2 className="size-3.5" />Share to social</Button>
      </div>
    )}
    {publishSteps.map(step => <PublishStepResult key={step.id} step={step} onOpenPosts={() => setSharing(true)} />)}
    {publishing && <EtsyPublishDialog productId={run.productId} open={publishing} onOpenChange={setPublishing} />}
    {printing && <PrintifyPublishDialog productId={run.productId} open={printing} onOpenChange={setPrinting} />}
    {sharing && <SocialShareDialog productId={run.productId} open={sharing} onOpenChange={setSharing} />}
  </div>;
};

/** Where a publish step of the run got: waiting, publishing, or on Etsy with a link and anything to fix there. */
const PublishStepResult = ({ step, onOpenPosts }: { step: WorkflowNodeRun; onOpenPosts: () => void }) => {
  const social = step.nodeType === "publish-social";
  const label = social ? "Push to media" : step.nodeType === "publish-printify" ? "Push to Printify" : "Publish to Etsy";
  // Push to media links the listing its pins point to, not a listing it made.
  const url = !social && typeof step.output.etsyUrl === "string" ? step.output.etsyUrl : null;
  const posts = typeof step.output.socialPosts === "number" ? step.output.socialPosts : 0;
  const warnings = Array.isArray(step.output.warnings) ? step.output.warnings.filter((item): item is string => typeof item === "string") : [];
  const attached = typeof step.output.mediaAttached === "number" ? step.output.mediaAttached : 0;
  const state = step.status === "succeeded" ? (social ? `${posts} post(s) ready` : url ? "On Etsy" : "Done") : step.status === "running" ? step.stage ?? "Running" : step.status === "failed" ? "Failed" : "Waiting";
  return (
    <div className="border-ink-200 space-y-1.5 rounded-md border px-3 py-2 text-xs">
      <p className="flex items-center justify-between gap-2">
        <span className="text-ink-800 font-medium">{label}</span>
        <span className={step.status === "succeeded" ? "text-emerald-700 dark:text-emerald-300" : step.status === "failed" ? "text-rose-700 dark:text-rose-300" : "text-ink-500"}>{state}</span>
      </p>
      {typeof step.output.madeAs === "string" && <p className="text-ink-600">Printify makes: {step.output.madeAs}</p>}
      {step.status === "succeeded" && attached > 0 && <p className="text-ink-500">{attached} Podivo image(s), video or file(s) added to the listing.</p>}
      {warnings.length > 0 && <ul className="list-disc space-y-0.5 pl-4 text-amber-800 dark:text-amber-300">{warnings.map(item => <li key={item}>{item}</li>)}</ul>}
      {social && step.status === "succeeded" && (
        <Button type="button" size="sm" variant="outline" onClick={onOpenPosts}><Share2 className="size-3.5" />Open the posts</Button>
      )}
      {url && (
        <Button asChild size="sm" variant="outline">
          <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" />{step.nodeType === "publish-etsy" ? "Open the Etsy draft" : "Open the Etsy listing"}</a>
        </Button>
      )}
    </div>
  );
};
