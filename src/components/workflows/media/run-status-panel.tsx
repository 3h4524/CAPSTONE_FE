"use client";
import { useState } from "react";
import { CircleAlert, ExternalLink, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("common");
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
    if (!parsed.success) { showToast("warning", parsed.error.issues[0]?.message ?? t("workflowMedia.runStatus.checkVideoSettings")); return; }
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
    if (!parsed.success) { showToast("warning", parsed.error.issues[0]?.message ?? t("workflowMedia.runStatus.checkVideoSettings")); return; }
    try {
      const token = await confirmAiShot(run.id, parsed.data, regenerate);
      if (token === null) return;
      // The settings on the canvas go with the request: the cost just confirmed was worked out from them, and a
      // change made after the failure (another source, another motion direction) is what the retry should use.
      action({ runId: run.id, expectedRevision: run.revision, action: regenerate ? "regenerate_ai_shot" : "retry", config: parsed.data, aiShotQuoteToken: token });
    } catch (error) { showToast("error", getErrorMessage(error)); }
  };
  if (isError) return <Button type="button" variant="outline" onClick={() => refetch()}>{t("workflowMedia.runStatus.reloadRun")}</Button>;
  if (!run) return null;
  return <div className="space-y-3 rounded-lg border p-3" aria-live="polite"><p className="text-sm font-medium">{t("workflowMedia.runStatus.runLabel", { status: t(`workflowMedia.runStatus.statuses.${run.status}`, { defaultValue: run.status.replaceAll("_", " ") }) })}</p><p className="text-muted-foreground text-xs">{t("workflowMedia.runStatus.snapshotRevision", { workflowRevision: run.workflowRevision, revision: run.revision })}</p>
    {active && <><p className="text-xs">{active.stage ?? active.nodeType} · {active.progress}%</p><Progress value={active.progress} aria-label={t("workflowMedia.runStatus.renderProgress")} /></>}
    {run.errorMessage && <p className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" role="alert">
      <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-rose-700 dark:text-rose-300" aria-hidden="true" />
      <span>{run.errorMessage}</span>
    </p>}
    {run.status === "cancelled" && <div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" disabled={isPending} onClick={() => void resume()}>{t("workflowMedia.runStatus.resume")}</Button><p className="text-muted-foreground text-xs">{t("workflowMedia.runStatus.resumeHint")}</p></div>}
    {printifyFailedAlone && <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => action({ runId: run.id, expectedRevision: run.revision, action: "retry" })}>{t("workflowMedia.runStatus.retryPushToPrintify")}</Button><p className="text-muted-foreground text-xs">{run.status === "failed" ? t("workflowMedia.runStatus.videoKept") : t("workflowMedia.runStatus.videoGoesOn")}</p></div>}
    {run.status === "failed" && !printifyFailedAlone && <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => retry()}>{t("workflowMedia.runStatus.retryCheckpoint")}</Button>{aiMode && <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => retry(true)}>{t("workflowMedia.runStatus.regenerateAiClips")}</Button>}</div>}
    {exportStep?.status === "succeeded" && (
      <div className="flex flex-wrap gap-2">
        {/* Print-on-demand: Printify makes the item and publishes it to Etsy, linked so orders reach it. */}
        <Button type="button" variant="outline" onClick={() => setPrinting(true)}>{t("workflowMedia.runStatus.pushToPrintify")}</Button>
        {/* A listing sent straight to Etsy has no print provider: meant for digital downloads. */}
        <Button type="button" variant="outline" onClick={() => setPublishing(true)}>{t("workflowMedia.runStatus.pushToEtsy")}</Button>
        {/* Posts for Pinterest and TikTok from the same approved media, to publish by hand. */}
        <Button type="button" variant="outline" onClick={() => setSharing(true)}><Share2 className="size-3.5" />{t("workflowMedia.runStatus.shareToSocial", { defaultValue: "Share to social" })}</Button>
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
  const { t } = useTranslation("common");
  const { run, isError, refetch } = useWorkflowRuntime();
  const { mutate: action, isPending } = useWorkflowRunAction();
  const batch = useGroupPrintify();
  // A batch run pushes each design on its own: its list says where each one is.
  if (batch) return <GroupPrintifyStatus batch={batch} />;
  if (isError) return <Button type="button" variant="outline" onClick={() => refetch()}>{t("workflowMedia.runStatus.reloadRun")}</Button>;
  if (!run) return null;
  if (!run.nodes.some(n => n.nodeType === "generate-video")) return <RunStatusPanel />;
  const step = run.nodes.find(n => n.nodeType === "publish-printify");
  if (!step) return null;
  // The server retries Printify on its own only when nothing else failed; otherwise the retry is the video's.
  const canRetry = run.status !== "cancelled" && step.status === "failed" && !run.nodes.some(n => n !== step && n.status === "failed");
  return <div className="space-y-3 rounded-lg border p-3" aria-live="polite">
    <p className="text-muted-foreground text-xs">{t("workflowMedia.runStatus.snapshotRevision", { workflowRevision: run.workflowRevision, revision: run.revision })}</p>
    {step.status === "running" && <><p className="text-xs">{step.stage ?? t("workflowMedia.runStatus.stepLabels.running")} · {step.progress}%</p><Progress value={step.progress} aria-label={t("workflowMedia.runStatus.printifyProgress")} /></>}
    {canRetry && <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => action({ runId: run.id, expectedRevision: run.revision, action: "retry" })}>{t("workflowMedia.runStatus.retryPushToPrintify")}</Button>}
    <PublishStepResult step={step} />
  </div>;
};

const STEP_LABEL_KEYS: Record<string, string> = {
  succeeded: "workflowMedia.runStatus.stepLabels.succeeded",
  failed: "workflowMedia.runStatus.stepLabels.failed",
  running: "workflowMedia.runStatus.stepLabels.running",
  cancelled: "workflowMedia.runStatus.stepLabels.cancelled",
};

/** Push to Printify for each design of a batch run, with why one failed and a retry of that design's step alone. */
const GroupPrintifyStatus = ({ batch }: { batch: GroupPrintify }) => {
  const { t } = useTranslation("common");
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
  const summary = [
    t("workflowMedia.runStatus.batchOnPrintify", { done: batch.done, total: batch.total }),
    batch.working > 0 && t("workflowMedia.runStatus.batchPushing", { working: batch.working }),
    batch.failed > 0 && t("workflowMedia.runStatus.batchFailed", { failed: batch.failed }),
  ]
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
            {step.status === "running" ? step.stage ?? t(STEP_LABEL_KEYS.running) : STEP_LABEL_KEYS[step.status] ? t(STEP_LABEL_KEYS[step.status]) : t("workflowMedia.runStatus.waiting")}
          </span>
        </p>
        {step.status === "failed" && step.error && <p className="text-rose-700 dark:text-rose-300" role="alert">{step.error}</p>}
        {canRetry && <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => void retry(target.runId!)}>{t("workflowMedia.runStatus.retryPushToPrintify")}</Button>}
      </div>;
    })}
  </div>;
};

/** Where a publish step of the run got: waiting, publishing, or on Etsy with a link and anything to fix there. */
const PublishStepResult = ({ step, onOpenPosts }: { step: WorkflowNodeRun; onOpenPosts?: () => void }) => {
  const { t } = useTranslation("common");
  const social = step.nodeType === "publish-social";
  const label = social
    ? t("workflowMedia.runStatus.pushToMedia", { defaultValue: "Push to media" })
    : step.nodeType === "publish-printify" ? t("workflowMedia.runStatus.pushToPrintify") : t("workflowMedia.runStatus.publishToEtsy");
  // Push to media links the listing its pins point to, not a listing it made.
  const url = !social && typeof step.output.etsyUrl === "string" ? step.output.etsyUrl : null;
  const posts = typeof step.output.socialPosts === "number" ? step.output.socialPosts : 0;
  const warnings = Array.isArray(step.output.warnings) ? step.output.warnings.filter((item): item is string => typeof item === "string") : [];
  const attached = typeof step.output.mediaAttached === "number" ? step.output.mediaAttached : 0;
  const pinUrls = Array.isArray(step.output.pinUrls) ? step.output.pinUrls.filter((item): item is string => typeof item === "string" && item.startsWith("https://")) : [];
  const board = typeof step.output.boardName === "string" ? step.output.boardName : null;
  const succeeded = social
    ? (pinUrls.length > 0
      ? t("workflowMedia.runStatus.pinsOnPinterest", { defaultValue: "{{count}} pin(s) on Pinterest", count: pinUrls.length })
      : t("workflowMedia.runStatus.postsReady", { defaultValue: "{{count}} post(s) ready", count: posts }))
    : url ? t("workflowMedia.runStatus.onEtsy") : t("workflowMedia.runStatus.stepLabels.succeeded");
  const state = step.status === "succeeded"
    ? succeeded
    : step.status === "running"
      ? step.stage ?? t("workflowMedia.runStatus.running")
      : step.status === "failed" ? t("workflowMedia.runStatus.stepLabels.failed") : t("workflowMedia.runStatus.waiting");
  return (
    <div className="border-ink-200 space-y-1.5 rounded-md border px-3 py-2 text-xs">
      <p className="flex items-center justify-between gap-2">
        <span className="text-ink-800 font-medium">{label}</span>
        <span className={step.status === "succeeded" ? "text-emerald-700 dark:text-emerald-300" : step.status === "failed" ? "text-rose-700 dark:text-rose-300" : "text-ink-500"}>{state}</span>
      </p>
      {step.status === "failed" && step.errorMessage && <p className="text-rose-700 dark:text-rose-300" role="alert">{step.errorMessage}</p>}
      {typeof step.output.madeAs === "string" && <p className="text-ink-600">{t("workflowMedia.runStatus.printifyMakes", { madeAs: step.output.madeAs })}</p>}
      {step.status === "succeeded" && attached > 0 && <p className="text-ink-500">{t("workflowMedia.runStatus.mediaAttached", { attached })}</p>}
      {warnings.length > 0 && <ul className="list-disc space-y-0.5 pl-4 text-amber-800 dark:text-amber-300">{warnings.map(item => <li key={item}>{item}</li>)}</ul>}
      {social && step.status === "succeeded" && pinUrls.length > 0 && (
        <div className="space-y-1">
          <p className="text-ink-600">{board ? t("workflowMedia.runStatus.postedToBoard", { defaultValue: "Posted to Pinterest on {{board}}:", board }) : t("workflowMedia.runStatus.postedToPinterest", { defaultValue: "Posted to Pinterest:" })}</p>
          <div className="flex flex-wrap gap-1.5">
            {pinUrls.map((pin, index) => (
              <a key={pin} href={pin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                <ExternalLink className="size-3" />{t("workflowMedia.runStatus.pin", { defaultValue: "Pin {{number}}", number: index + 1 })}
              </a>
            ))}
          </div>
        </div>
      )}
      {social && step.status === "succeeded" && onOpenPosts && (
        <Button type="button" size="sm" variant="outline" onClick={onOpenPosts}><Share2 className="size-3.5" />{t("workflowMedia.runStatus.openPosts", { defaultValue: "Open the posts" })}</Button>
      )}
      {url && (
        <Button asChild size="sm" variant="outline">
          <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" />{step.nodeType === "publish-etsy" ? t("workflowMedia.runStatus.openEtsyDraft") : t("workflowMedia.runStatus.openEtsyListing")}</a>
        </Button>
      )}
    </div>
  );
};
