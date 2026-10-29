"use client";

import { useEffect, useMemo } from "react";
import { ImageOff, PackageSearch } from "lucide-react";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PanelEmptyState } from "@/components/workflows/config-panel/layout/panel-empty-state";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { LifestyleMockupForm } from "@/components/workflows/media/lifestyle-mockup-form";
import { MockupCard } from "@/components/workflows/media/mockup-card";
import { MockupUploadForm } from "@/components/workflows/media/mockup-upload-form";
import { MAX_VIDEO_MOCKUPS } from "@/constants/workflow-panel";
import { artworkGroupLabel } from "@/helpers/artwork-groups";
import { confirmAiShot } from "@/helpers/confirm-ai-shot";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { readString, readStringArray } from "@/helpers/workflow-config";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { generateVideoConfigSchema } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";

export const MockupPanel = ({ review }: { review: boolean }) => {
  const input = useWorkflowStore(state => state.nodes.find(n => n.data.type === "product-input"));
  const mockup = useWorkflowStore(state => state.nodes.find(n => n.data.type === "apply-mockup"));
  const productId = readString(input?.data.config.productId);
  const { run, isRunning } = useWorkflowRuntime();
  const { data: assets, isPending, isError, refetch } = useMockupAssets(run?.productId ?? productId);
  const { mutate: action, isPending: isActing } = useWorkflowRunAction();
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
  const continueWithMockups = async () => {
    if (!run) return;
    const videoNode = useWorkflowStore.getState().nodes.find(n => n.data.type === "generate-video");
    const parsed = generateVideoConfigSchema.safeParse(videoNode?.data.config);
    if (!parsed.success) { showToast("warning", parsed.error.issues[0]?.message ?? "Check video settings."); return; }
    try {
      const token = await confirmAiShot(run.id, parsed.data);
      if (token === null) return;
      action({ runId: run.id, expectedRevision: run.revision, action: "resume_mockups", aiShotQuoteToken: token });
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
        <Button type="button" className="w-full hover:translate-y-0" disabled={isActing} onClick={continueWithMockups}>Continue with approved mockups</Button>
      </div>
    )}
  </div>;
};
