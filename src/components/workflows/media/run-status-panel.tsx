"use client";
import { useState } from "react";
import { CircleAlert, ExternalLink, Share2 } from "lucide-react";

import { runGroupKeys } from "@/api/run-groups";
import { getWorkflowRun, videoWorkflowKeys } from "@/api/video-workflow";
import { EtsyPublishDialog } from "@/components/shop/etsy-publish-dialog";
import { PrintifyPublishDialog } from "@/components/shop/printify-publish-dialog";
import { SocialShareDialog } from "@/components/shop/social-share-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { confirmAiShot } from "@/helpers/confirm-ai-shot";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { type GroupPrintify, useGroupPrintify } from "@/hooks/queries/use-group-printify";
import { videoStatusOf } from "@/hooks/queries/use-group-videos";
import { useRunGroupId } from "@/hooks/queries/use-run-group";
import { useAppQueryClient } from "@/hooks/use-query-client";
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
  const publishSteps = run?.nodes.filter(n => n.nodeType === "publish-printify" || n.nodeType === "publish-etsy" || n.nodeType === "publish-social") ?? [];
  const videoFailed = run?.nodes.some(n => n.nodeType === "generate-video" && n.status === "failed") ?? false;
  // Push to Printify runs beside the video: when it is the only step that failed, it is retried on its own, while the
  // video goes on or after it is done. The video is not made again for it.
  const printifyFailedAlone = run?.status !== "cancelled"
    && (run?.nodes.some(n => n.nodeType === "publish-printify" && n.status === "failed") ?? false)
    && !(run?.nodes.some(n => n.nodeType !== "publish-printify" && n.status === "failed") ?? false);
  // A stopped run goes on from where it stopped. The settings on the canvas go with it: a change made since (a scene
  // made longer) is rendered, and only then is the cost of the clips it adds shown first.
  const resume = async () => {
    if (!run) return;
    if (!run.nodes.some(n => n.nodeType === "generate-video")) { action({ runId: run.id, expectedRevision: run.revision, action: "resume" }); return; }
    const videoNode = useWorkflowStore.getState().nodes.find(n => n.data.type === "generate-video");
    const parsed = generateVideoConfigSchema.safeParse(videoNode?.data.config);
    if (!parsed.success) { showToast("warning", parsed.error.issues[0]?.message ?? "Check video settings."); return; }
    try {
      const token = await confirmAiShot(run.id, parsed.data);
      if (token === null) return;
      action({ runId: run.id, expectedRevision: run.revision, action: "resume", config: parsed.data, aiShotQuoteToken: token || undefined });
    } catch (error) { showToast("error", getErrorMessage(error)); }
  };
  const retry = async (regenerate = false) => {
    if (!run) return;
    // Only the ZIP or a publish step failed: it runs again from the approved package, with nothing to change or confirm.
    // When the video failed too, the retry below sends the canvas settings, and a failed Printify goes again with it.
    if (!regenerate && !videoFailed && (exportStep?.status === "failed" || publishSteps.some(step => step.status === "failed"))) { action({ runId: run.id, expectedRevision: run.revision, action: "retry" }); return; }
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
    {run.status === "cancelled" && <div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" disabled={isPending} onClick={() => void resume()}>Resume</Button><p className="text-muted-foreground text-xs">Goes on from where it stopped and keeps what was already made.</p></div>}
    {printifyFailedAlone && <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => action({ runId: run.id, expectedRevision: run.revision, action: "retry" })}>Retry Push to Printify</Button><p className="text-muted-foreground text-xs">{run.status === "failed" ? "The video is kept as it is." : "The video goes on meanwhile."}</p></div>}
    {run.status === "failed" && !printifyFailedAlone && <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => retry()}>Retry checkpoint</Button>{aiMode && <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => retry(true)}>Regenerate AI clips</Button>}</div>}
    {exportStep?.status === "succeeded" && (
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

/**
 * The run as Push to Printify sees it. Printify takes the design and the approved mock-ups, never the video, so beside
 * a video it shows only its own step: its progress, its error and its retry, not the render or the video's actions.
 * A run without a video has nothing else going on, and shows the whole run.
 */
export const PrintifyRunStatus = () => {
  const { run, isError, refetch } = useWorkflowRuntime();
  const { mutate: action, isPending } = useWorkflowRunAction();
  const batch = useGroupPrintify();
  // A batch run pushes each design on its own: its list says where each one is.
  if (batch) return <GroupPrintifyStatus batch={batch} />;
  if (isError) return <Button type="button" variant="outline" onClick={() => refetch()}>Reload run</Button>;
  if (!run) return null;
  if (!run.nodes.some(n => n.nodeType === "generate-video")) return <RunStatusPanel />;
  const step = run.nodes.find(n => n.nodeType === "publish-printify");
  if (!step) return null;
  // The server retries Printify on its own only when nothing else failed; otherwise the retry is the video's.
  const canRetry = run.status !== "cancelled" && step.status === "failed" && !run.nodes.some(n => n !== step && n.status === "failed");
  return <div className="space-y-3 rounded-lg border p-3" aria-live="polite">
    <p className="text-muted-foreground text-xs">Snapshot revision {run.workflowRevision} · run r{run.revision}</p>
    {step.status === "running" && <><p className="text-xs">{step.stage ?? "Pushing"} · {step.progress}%</p><Progress value={step.progress} aria-label="Printify progress" /></>}
    {canRetry && <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => action({ runId: run.id, expectedRevision: run.revision, action: "retry" })}>Retry Push to Printify</Button>}
    <PublishStepResult step={step} />
  </div>;
};

const STEP_LABELS: Record<string, string> = { succeeded: "Done", failed: "Failed", running: "Pushing", cancelled: "Stopped" };

/** Push to Printify for each design of a batch run, with why one failed and a retry of that design's step alone. */
const GroupPrintifyStatus = ({ batch }: { batch: GroupPrintify }) => {
  const { mutate: action, isPending } = useWorkflowRunAction();
  const client = useAppQueryClient();
  const groupId = useRunGroupId();
  const retry = async (runId: string) => {
    try {
      // The design's run is not the one open on the canvas: its revision is read first.
      const run = await client.fetchQuery({ queryKey: videoWorkflowKeys.run(runId), queryFn: () => getWorkflowRun(runId), staleTime: 0 });
      action({ runId, expectedRevision: run.revision, action: "retry" }, {
        onSuccess: () => void client.invalidateQueries({ queryKey: runGroupKeys.detail(groupId) }),
      });
    } catch (error) { showToast("error", getErrorMessage(error)); }
  };
  const summary = [`${batch.done} of ${batch.total} on Printify`, batch.working > 0 && `${batch.working} pushing`, batch.failed > 0 && `${batch.failed} failed`]
    .filter(Boolean).join(" · ");
  return <div className="space-y-3 rounded-lg border p-3" aria-live="polite">
    <p className="text-sm font-medium">{summary}</p>
    {batch.targets.map(target => {
      const step = target.printify!;
      // Retried alone only while the video did not fail: the server retries a failed video with it otherwise.
      const canRetry = step.status === "failed" && videoStatusOf(target) !== "failed" && target.runStatus !== "cancelled";
      return <div key={target.key} className="border-ink-200 space-y-1.5 rounded-md border px-3 py-2 text-xs">
        <p className="flex items-center justify-between gap-2">
          <span className="text-ink-800 truncate font-medium">{target.designLabel} · {target.productName}</span>
          <span className={step.status === "succeeded" ? "text-emerald-700 dark:text-emerald-300" : step.status === "failed" ? "text-rose-700 dark:text-rose-300" : "text-ink-500"}>
            {step.status === "running" ? step.stage ?? STEP_LABELS.running : STEP_LABELS[step.status] ?? "Waiting"}
          </span>
        </p>
        {step.status === "failed" && step.error && <p className="text-rose-700 dark:text-rose-300" role="alert">{step.error}</p>}
        {canRetry && <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => void retry(target.runId!)}>Retry Push to Printify</Button>}
      </div>;
    })}
  </div>;
};

/** Where a publish step of the run got: waiting, publishing, or on Etsy with a link and anything to fix there. */
const PublishStepResult = ({ step, onOpenPosts }: { step: WorkflowNodeRun; onOpenPosts?: () => void }) => {
  const social = step.nodeType === "publish-social";
  const label = social ? "Push to media" : step.nodeType === "publish-printify" ? "Push to Printify" : "Publish to Etsy";
  // Push to media links the listing its pins point to, not a listing it made.
  const url = !social && typeof step.output.etsyUrl === "string" ? step.output.etsyUrl : null;
  const posts = typeof step.output.socialPosts === "number" ? step.output.socialPosts : 0;
  const warnings = Array.isArray(step.output.warnings) ? step.output.warnings.filter((item): item is string => typeof item === "string") : [];
  const attached = typeof step.output.mediaAttached === "number" ? step.output.mediaAttached : 0;
  const pinUrls = Array.isArray(step.output.pinUrls) ? step.output.pinUrls.filter((item): item is string => typeof item === "string" && item.startsWith("https://")) : [];
  const board = typeof step.output.boardName === "string" ? step.output.boardName : null;
  const state = step.status === "succeeded" ? (social ? (pinUrls.length > 0 ? `${pinUrls.length} pin(s) on Pinterest` : `${posts} post(s) ready`) : url ? "On Etsy" : "Done") : step.status === "running" ? step.stage ?? "Running" : step.status === "failed" ? "Failed" : "Waiting";
  return (
    <div className="border-ink-200 space-y-1.5 rounded-md border px-3 py-2 text-xs">
      <p className="flex items-center justify-between gap-2">
        <span className="text-ink-800 font-medium">{label}</span>
        <span className={step.status === "succeeded" ? "text-emerald-700 dark:text-emerald-300" : step.status === "failed" ? "text-rose-700 dark:text-rose-300" : "text-ink-500"}>{state}</span>
      </p>
      {step.status === "failed" && step.errorMessage && <p className="text-rose-700 dark:text-rose-300" role="alert">{step.errorMessage}</p>}
      {typeof step.output.madeAs === "string" && <p className="text-ink-600">Printify makes: {step.output.madeAs}</p>}
      {step.status === "succeeded" && attached > 0 && <p className="text-ink-500">{attached} Podivo image(s), video or file(s) added to the listing.</p>}
      {warnings.length > 0 && <ul className="list-disc space-y-0.5 pl-4 text-amber-800 dark:text-amber-300">{warnings.map(item => <li key={item}>{item}</li>)}</ul>}
      {social && step.status === "succeeded" && pinUrls.length > 0 && (
        <div className="space-y-1">
          <p className="text-ink-600">Posted to Pinterest{board ? ` on ${board}` : ""}:</p>
          <div className="flex flex-wrap gap-1.5">
            {pinUrls.map((pin, index) => (
              <a key={pin} href={pin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                <ExternalLink className="size-3" />Pin {index + 1}
              </a>
            ))}
          </div>
        </div>
      )}
      {social && step.status === "succeeded" && onOpenPosts && (
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
