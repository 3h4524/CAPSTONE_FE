"use client";
import { useState } from "react";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VideoPreviewFrame } from "@/components/workflows/media/video-preview-frame";
import { VideoSceneCard } from "@/components/workflows/media/video-scene-card";
import { showToast } from "@/helpers/toast";
import { readString, readStringArray } from "@/helpers/workflow-config";
import { useMediaDownload } from "@/hooks/mutations/use-media-download";
import { usePreviewVideoStoryboard } from "@/hooks/mutations/use-preview-video-storyboard";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useRunVideos } from "@/hooks/queries/use-run-videos";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { generateVideoConfigSchema } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";

export const VideoReviewPanel = () => {
  const { run, runId } = useWorkflowRuntime();
  const { data: videos, isPending } = useRunVideos(runId);
  const { data: assets } = useMockupAssets(run?.productId ?? "");
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
      action({ runId: run.id, expectedRevision: run.revision, action: "rerender", config: parsed.data, expectedStoryboardFingerprint: storyboard.fingerprint });
    } catch {
      // The preview mutation reports the actionable error and rerender stays blocked.
    }
  };
  if (!runId) return <p className="text-muted-foreground text-sm">Run the workflow to create a video.</p>;
  if (isPending) return <SectionLoading label="Loading video versions" />;
  if (!video) return <p className="text-muted-foreground text-sm">No video candidate yet. Complete Mockup Approval first.</p>;
  return <div className="space-y-4">
    <Select value={video.id} onValueChange={setViewedId}><SelectTrigger aria-label="Video version"><SelectValue /></SelectTrigger><SelectContent>{videos?.map(v => <SelectItem key={v.id} value={v.id}>Version {v.version} · {v.approvalStatus}</SelectItem>)}</SelectContent></Select>
    <div className="flex flex-wrap gap-2"><Badge>Standard</Badge><Badge variant="outline">{video.template}</Badge><Badge variant="secondary">{video.status}</Badge></div>
    {video.previewUrl && <VideoPreviewFrame width={video.width} height={video.height} maxHeightRem={34}>
      <video key={video.id} controls preload="metadata" poster={video.thumbnailUrl ?? undefined} className="size-full bg-black"><source src={video.previewUrl} type="video/mp4" /><track kind="captions" /></video>
    </VideoPreviewFrame>}
    <p className="text-muted-foreground text-xs">Version {video.version} · {video.aspectRatio} · {video.width} × {video.height} · review r{video.reviewRevision} · QA {video.qa.fullDecode === true ? "Passed full decode" : "Pending"}</p>
    <div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled={!canReview || isActing || video.approvalStatus === "approved"} onClick={() => run && action({ runId: run.id, expectedRevision: run.revision, action: "approve_video", videoId: video.id, reviewRevision: video.reviewRevision })}>Approve video</Button>
      <Button type="button" size="sm" variant="outline" disabled={!canReview || isActing || video.approvalStatus === "rejected"} onClick={() => run && action({ runId: run.id, expectedRevision: run.revision, action: "reject_video", videoId: video.id, reviewRevision: video.reviewRevision })}>Reject</Button>
      <Button type="button" size="sm" variant="outline" disabled={isDownloading || !video.previewUrl} onClick={() => download({ id: video.id, zip: false }, { onSuccess: url => window.location.assign(url) })}>Download MP4</Button>
      <Button type="button" size="sm" variant="ghost" disabled={!canReview} onClick={() => generate && useWorkflowStore.getState().selectNode(generate.id)}>Edit configuration</Button>
      <Button type="button" size="sm" variant="outline" disabled={!canReview || isActing || isPreviewing} onClick={rerender}>{isPreviewing ? "Checking storyboard…" : "Re-render"}</Button></div>
    {!canReview && <p className="text-muted-foreground text-xs">Only the current review candidate can be approved. Previous versions remain available.</p>}
    {video.scenes.map(scene => <VideoSceneCard key={scene.sceneOrder} scene={scene} asset={assets?.find(a => a.id === scene.mockupId)} />)}
  </div>;
};
