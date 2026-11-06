"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageOff, PackageSearch } from "lucide-react";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PanelEmptyState } from "@/components/workflows/config-panel/layout/panel-empty-state";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { AiPromptReviewDialog } from "@/components/workflows/media/ai-prompt-review-dialog";
import { LifestyleMockupForm } from "@/components/workflows/media/lifestyle-mockup-form";
import { MockupCard } from "@/components/workflows/media/mockup-card";
import { MockupUploadForm } from "@/components/workflows/media/mockup-upload-form";
import { MAX_VIDEO_MOCKUPS } from "@/constants/workflow-panel";
import { artworkGroupLabel } from "@/helpers/artwork-groups";
import { confirmAiShot } from "@/helpers/confirm-ai-shot";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { readString, readStringArray } from "@/helpers/workflow-config";
import { usePreviewVideoStoryboard } from "@/hooks/mutations/use-preview-video-storyboard";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { generateVideoConfigSchema } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import type { AiPromptTrace, GenerateVideoConfig } from "@/types/video-workflow";

export const MockupPanel = ({ review }: { review: boolean }) => {
  const input = useWorkflowStore(state => state.nodes.find(n => n.data.type === "product-input"));
  const mockup = useWorkflowStore(state => state.nodes.find(n => n.data.type === "apply-mockup"));
  const productId = readString(input?.data.config.productId);
  const { run, isRunning } = useWorkflowRuntime();
  const { data: assets, isPending, isError, refetch } = useMockupAssets(run?.productId ?? productId);
  const { mutateAsync: action, isPending: isActing } = useWorkflowRunAction();
  const { mutateAsync: previewStoryboard, isPending: isPreviewing } = usePreviewVideoStoryboard();
  const [promptReview, setPromptReview] = useState<{ config: GenerateVideoConfig; fingerprint: string; prompts: { sceneOrder: number; trace: AiPromptTrace }[] } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const selected = readStringArray(mockup?.data.config.mockupIds);
  const artworkGroups = useMemo(() => [...new Set((assets ?? []).map(asset => asset.artworkGroupKey).filter((group): group is string => Boolean(group)))], [assets]);
  const configuredGroup = readString(mockup?.data.config.artworkGroupKey);
  const suggestedGroup = [...artworkGroups].sort((left, right) => {
    const difference = (assets?.filter(asset => asset.artworkGroupKey === right).length ?? 0) - (assets?.filter(asset => asset.artworkGroupKey === left).length ?? 0);
    return difference || left.localeCompare(right);
  })[0];
  const activeGroup = artworkGroups.includes(configuredGroup) ? configuredGroup : suggestedGroup;
  const visibleAssets = activeGroup ? assets?.filter(asset => asset.artworkGroupKey === activeGroup) : assets;

  useEffect(() => {
    if (!mockup || isPending || !assets) return;
    const nextGroup = artworkGroups.includes(configuredGroup) ? configuredGroup : suggestedGroup ?? "";
    const validIds = new Set(assets
      .filter(asset => !nextGroup || asset.artworkGroupKey === nextGroup)
      .map(asset => asset.id));
    const nextSelected = selected.filter(id => validIds.has(id));
    const selectionChanged = nextSelected.length !== selected.length || nextSelected.some((id, index) => id !== selected[index]);
    if (nextGroup === configuredGroup && !selectionChanged) return;
    useWorkflowStore.getState().updateNodeConfig(mockup.id, {
      ...mockup.data.config,
      artworkGroupKey: nextGroup,
      mockupIds: nextSelected,
    });
  }, [artworkGroups, assets, configuredGroup, isPending, mockup, selected, suggestedGroup]);

  const selectArtworkGroup = (group: string) => {
    if (!mockup) return;
    const validIds = new Set((assets ?? []).filter(asset => asset.artworkGroupKey === group).map(asset => asset.id));
    useWorkflowStore.getState().updateNodeConfig(mockup.id, { ...mockup.data.config, artworkGroupKey: group, mockupIds: selected.filter(id => validIds.has(id)) });
  };
  const choose = (id: string, checked: boolean) => {
    if (!mockup) return;
    if (checked && selected.length >= MAX_VIDEO_MOCKUPS) { showToast("warning", "Choose at most eight mockups."); return; }
    useWorkflowStore.getState().updateNodeConfig(mockup.id, { ...mockup.data.config, mockupIds: checked ? [...selected, id] : selected.filter(x => x !== id) });
  };
  const resumeWithCostConfirmation = async (config: GenerateVideoConfig, expectedStoryboardFingerprint?: string) => {
    if (!run) return;
    try {
      setIsConfirming(true);
      const token = await confirmAiShot(run.id, config, false, undefined, expectedStoryboardFingerprint);
      if (token === null) return;
      await action({ runId: run.id, expectedRevision: run.revision, action: "resume_mockups", aiShotQuoteToken: token });
      setPromptReview(null);
    } catch (error) { showToast("error", getErrorMessage(error)); }
    finally { setIsConfirming(false); }
  };
  const continueWithMockups = async () => {
    if (!run) return;
    const videoNode = useWorkflowStore.getState().nodes.find(n => n.data.type === "generate-video");
    const parsed = generateVideoConfigSchema.safeParse(videoNode?.data.config);
    if (!parsed.success) { showToast("warning", parsed.error.issues[0]?.message ?? "Check video settings."); return; }
    const hasAiScenes = parsed.data.mode === "ai_shot" &&
      (!parsed.data.aiScenes?.length || parsed.data.aiScenes.some(scene => scene.mode !== "standard"));
    if (!hasAiScenes) { await resumeWithCostConfirmation(parsed.data); return; }
    try {
      const board = await previewStoryboard({
        productId: run.productId,
        config: parsed.data,
        mockupIds: readStringArray(mockup?.data.config.mockupIds),
        artworkGroupKey: readString(mockup?.data.config.artworkGroupKey),
      });
      const prompts = board.scenes.flatMap(scene => scene.aiPromptTrace == null ? [] : [{ sceneOrder: scene.sceneOrder, trace: scene.aiPromptTrace }]);
      if (prompts.length === 0) { showToast("warning", "The AI prompt preview is not available. Check the selected scenes."); return; }
      setPromptReview({ config: parsed.data, fingerprint: board.fingerprint, prompts });
    } catch (error) { showToast("error", getErrorMessage(error)); }
  };
  if (!productId && !run) {
    return review
      ? <PanelEmptyState icon={PackageSearch} title="Choose the product for the video above." description="Its mock-ups are listed here for review." />
      : <PanelEmptyState icon={PackageSearch} title="Select a product in Product Input first." description="The video is made for one product of the batch." />;
  }
  return <div className="@container space-y-5">
    {!review && <MockupUploadForm productId={run?.productId ?? productId} />}
    <LifestyleMockupForm productId={run?.productId ?? productId} assets={visibleAssets ?? []} />
    {artworkGroups.length > 1 && <div className="space-y-2"><Label htmlFor="mockup-artwork-group">Artwork group</Label><Select value={activeGroup} onValueChange={selectArtworkGroup}><SelectTrigger id="mockup-artwork-group" className="w-full bg-white"><SelectValue /></SelectTrigger><SelectContent>{artworkGroups.map(group => <SelectItem key={group} value={group}>{artworkGroupLabel(group, artworkGroups)}</SelectItem>)}</SelectContent></Select></div>}
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-slate-900">{review ? "Mock-ups to review" : "Available mock-ups"}</p>
        {selected.length > 0 && <p className="text-xs font-medium text-slate-700 tabular-nums">{`${selected.length}/${MAX_VIDEO_MOCKUPS} selected`}</p>}
      </div>
      {!selected.length && <p className="text-muted-foreground -mt-2 text-xs">Automatic: up to 8 approved mockups from one artwork group.</p>}
      {isPending ? <SectionLoading label="Loading mockups" className="py-8" />
        : isError ? <PanelNotice tone="error" action={<Button type="button" variant="outline" size="sm" className="h-7 bg-white px-3 text-xs hover:translate-y-0" onClick={() => refetch()}>Reload mockups</Button>}>Mock-ups could not be loaded.</PanelNotice>
          : !visibleAssets?.length ? <PanelEmptyState icon={ImageOff} title="No mockups yet. Upload images in Apply Mockup." />
            : <div className="grid gap-3 @md:grid-cols-2">{visibleAssets.map(asset => <MockupCard key={asset.id} asset={asset} artworkGroups={artworkGroups} review={review} selectable={!review && !isRunning} selected={selected.includes(asset.id)} onSelect={choose} />)}</div>}
    </div>
    {review && run?.status === "waiting_for_input" && (
      <div className="sticky bottom-0 -mx-5 border-t bg-white/95 px-5 py-3 backdrop-blur">
        <Button type="button" className="w-full hover:translate-y-0" disabled={isActing || isPreviewing} onClick={() => void continueWithMockups()}>{isPreviewing ? "Preparing prompt preview…" : "Review prompt before creating video"}</Button>
      </div>
    )}
    {promptReview && <AiPromptReviewDialog open prompts={promptReview.prompts} isContinuing={isConfirming || isActing} onOpenChange={open => { if (!open && !isConfirming && !isActing) setPromptReview(null); }} onContinue={() => void resumeWithCostConfirmation(promptReview.config, promptReview.fingerprint)} />}
  </div>;
};
