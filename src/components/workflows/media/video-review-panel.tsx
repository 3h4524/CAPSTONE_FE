"use client";
import { useState } from "react";
import { Check, Download, Film, RotateCcw, X } from "lucide-react";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VideoPreviewFrame } from "@/components/workflows/media/video-preview-frame";
import { confirmAiShot } from "@/helpers/confirm-ai-shot";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { readString, readStringArray } from "@/helpers/workflow-config";
import { useMediaDownload } from "@/hooks/mutations/use-media-download";
import { usePreviewVideoStoryboard } from "@/hooks/mutations/use-preview-video-storyboard";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useRunVideos } from "@/hooks/queries/use-run-videos";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { generateVideoConfigSchema } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";

export const VideoReviewPanel = () => {
  const { run, runId } = useWorkflowRuntime();
  const { data: videos, isPending } = useRunVideos(runId);
  const { mutate: action, isPending: isActing } = useWorkflowRunAction();
  const { mutateAsync: previewStoryboard, isPending: isPreviewing } = usePreviewVideoStoryboard();
  const { mutate: download, isPending: isDownloading } = useMediaDownload();
  const [viewedId, setViewedId] = useState<string | null>(null);
  const video = videos?.find(v => v.id === viewedId) ?? videos?.[0];
  const generate = useWorkflowStore(state => state.nodes.find(n => n.data.type === "generate-video"));
  const mockup = useWorkflowStore(state => state.nodes.find(n => n.data.type === "apply-mockup"));
  const candidateId = run?.nodes.find(n => n.nodeType === "review-video")?.output.videoId;
  const canReview = run?.status === "waiting_for_review" && video?.id === candidateId && video?.status === "completed";
  const rerender = async () => {
    if (!run || !generate) return;
    const parsed = generateVideoConfigSchema.safeParse(generate.data.config);
    if (!parsed.success) { showToast("warning", parsed.error.issues[0]?.message ?? "Check video settings."); return; }
    try {
      const storyboard = await previewStoryboard({
        productId: run.productId,
        config: parsed.data,
        mockupIds: readStringArray(mockup?.data.config.mockupIds),
        artworkGroupKey: readString(mockup?.data.config.artworkGroupKey),
      });
      const token = await confirmAiShot(run.id, parsed.data);
      if (token === null) return;
      action({ runId: run.id, expectedRevision: run.revision, action: "rerender", config: parsed.data, expectedStoryboardFingerprint: storyboard.fingerprint, aiShotQuoteToken: token });
    } catch (error) { showToast("error", getErrorMessage(error)); }
  };
  if (!runId) return <section className="bg-card rounded-xl border p-4" aria-labelledby="final-video-title">
    <h3 id="final-video-title" className="text-base font-semibold">Final video</h3>
    <div className="bg-muted/35 text-muted-foreground mt-3 flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg px-4 text-center">
      <Film className="size-5" aria-hidden="true" />
      <p className="text-xs leading-relaxed">Run the workflow to generate and join the scene videos.</p>
    </div>
  </section>;
  if (isPending) return <section className="bg-card rounded-xl border p-4" aria-labelledby="final-video-title"><h3 id="final-video-title" className="text-base font-semibold">Final video</h3><div className="mt-4"><SectionLoading label="Loading video versions" /></div></section>;
  if (!video) return <section className="bg-card rounded-xl border p-4" aria-labelledby="final-video-title"><h3 id="final-video-title" className="text-base font-semibold">Final video</h3><p className="text-muted-foreground mt-1 text-xs">The joined video will appear here when generation completes.</p></section>;
  return <section className="bg-card overflow-hidden rounded-xl border" aria-labelledby="final-video-title">
    <header className="flex flex-wrap items-end justify-between gap-3 p-4">
      <div className="space-y-1">
        <h3 id="final-video-title" className="text-base font-semibold">Final video</h3>
        <p className="text-muted-foreground text-xs">Review the joined output before approval or download.</p>
      </div>
      <label className="w-full space-y-1 text-xs font-medium min-[420px]:w-40">Version
        <Select value={video.id} onValueChange={setViewedId}><SelectTrigger aria-label="Video version"><SelectValue /></SelectTrigger><SelectContent>{videos?.map(v => <SelectItem key={v.id} value={v.id}>Version {v.version} · {v.approvalStatus}</SelectItem>)}</SelectContent></Select>
      </label>
    </header>
    <div className="space-y-4 px-4 pb-4">
      {video.previewUrl ? <VideoPreviewFrame width={video.width} height={video.height} maxHeightRem={34}>
        <video key={video.id} controls preload="metadata" poster={video.thumbnailUrl ?? undefined} className="size-full bg-black"><source src={video.previewUrl} type="video/mp4" /><track kind="captions" /></video>
      </VideoPreviewFrame> : <div className="bg-muted/35 text-muted-foreground flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg px-4 text-center">
        <Film className="size-5" aria-hidden="true" />
        <p className="text-xs leading-relaxed">The joined preview is being prepared.</p>
      </div>}
      <dl className="bg-muted/35 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg p-3 sm:grid-cols-4">
        <div><dt className="text-muted-foreground text-[11px]">Version</dt><dd className="mt-0.5 text-xs font-semibold">{video.version}</dd></div>
        <div><dt className="text-muted-foreground text-[11px]">Format</dt><dd className="mt-0.5 text-xs font-semibold">{video.aspectRatio} · {video.width} × {video.height}</dd></div>
        <div><dt className="text-muted-foreground text-[11px]">Review</dt><dd className="mt-0.5 text-xs font-semibold">Revision {video.reviewRevision}</dd></div>
        <div><dt className="text-muted-foreground text-[11px]">Quality check</dt><dd className="mt-0.5 text-xs font-semibold">{video.qa.fullDecode === true ? "Passed" : "Pending"}</dd></div>
      </dl>
      <div className="flex items-center gap-2">
        <Button type="button" size="icon-sm" aria-label="Approve video" title="Approve video" disabled={!canReview || isActing || video.approvalStatus === "approved"} onClick={() => run && action({ runId: run.id, expectedRevision: run.revision, action: "approve_video", videoId: video.id, reviewRevision: video.reviewRevision })}><Check aria-hidden="true" /></Button>
        <Button type="button" size="icon-sm" variant="outline" aria-label="Reject video" title="Reject video" disabled={!canReview || isActing || video.approvalStatus === "rejected"} onClick={() => run && action({ runId: run.id, expectedRevision: run.revision, action: "reject_video", videoId: video.id, reviewRevision: video.reviewRevision })}><X aria-hidden="true" /></Button>
        <Button type="button" size="icon-sm" variant="outline" aria-label="Download MP4" title="Download MP4" disabled={isDownloading || !video.previewUrl} onClick={() => download({ id: video.id, zip: false }, { onSuccess: url => window.location.assign(url) })}><Download aria-hidden="true" /></Button>
        <Button type="button" size="icon-sm" variant="outline" aria-label={isPreviewing ? "Checking storyboard" : "Re-render video"} title={isPreviewing ? "Checking storyboard…" : "Re-render video"} disabled={!canReview || isActing || isPreviewing} onClick={rerender}><RotateCcw aria-hidden="true" /></Button>
      </div>
      {!canReview && <p className="text-muted-foreground text-xs leading-relaxed">Only the current completed version can be approved. Older versions remain available from the version menu.</p>}
    </div>
  </section>;
};
