"use client";

import { useEffect, useMemo } from "react";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MockupCard } from "@/components/workflows/media/mockup-card";
import { MockupUploadForm } from "@/components/workflows/media/mockup-upload-form";
import { artworkGroupLabel } from "@/helpers/artwork-groups";
import { showToast } from "@/helpers/toast";
import { readString, readStringArray } from "@/helpers/workflow-config";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
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
  const activeGroup = artworkGroups.length > 1 ? configuredGroup || suggestedGroup : artworkGroups[0];
  const visibleAssets = artworkGroups.length > 1 ? assets?.filter(asset => asset.artworkGroupKey === activeGroup) : assets;

  useEffect(() => {
    if (!mockup || artworkGroups.length < 2 || !suggestedGroup || artworkGroups.includes(configuredGroup)) return;
    useWorkflowStore.getState().updateNodeConfig(mockup.id, { ...mockup.data.config, artworkGroupKey: suggestedGroup, mockupIds: [] });
  }, [artworkGroups, configuredGroup, mockup, suggestedGroup]);

  const selectArtworkGroup = (group: string) => {
    if (!mockup) return;
    const validIds = new Set((assets ?? []).filter(asset => asset.artworkGroupKey === group).map(asset => asset.id));
    useWorkflowStore.getState().updateNodeConfig(mockup.id, { ...mockup.data.config, artworkGroupKey: group, mockupIds: selected.filter(id => validIds.has(id)) });
  };
  const choose = (id: string, checked: boolean) => {
    if (!mockup) return;
    if (checked && selected.length >= 8) { showToast("warning", "Choose at most eight mockups."); return; }
    useWorkflowStore.getState().updateNodeConfig(mockup.id, { ...mockup.data.config, mockupIds: checked ? [...selected, id] : selected.filter(x => x !== id) });
  };
  if (!productId && !run) return <p className="text-muted-foreground text-sm">Select a product in Product Input first.</p>;
  return <div className="space-y-4">
    {!review && <MockupUploadForm productId={run?.productId ?? productId} />}
    {artworkGroups.length > 1 && <div className="space-y-2"><label className="text-sm font-medium" htmlFor="mockup-artwork-group">Artwork group</label><Select value={activeGroup} onValueChange={selectArtworkGroup}><SelectTrigger id="mockup-artwork-group"><SelectValue /></SelectTrigger><SelectContent>{artworkGroups.map(group => <SelectItem key={group} value={group}>{artworkGroupLabel(group, artworkGroups)}</SelectItem>)}</SelectContent></Select></div>}
    <p className="text-muted-foreground text-xs">{selected.length ? `${selected.length}/8 selected` : "Automatic: up to 8 approved mockups from one artwork group."}</p>
    {isPending ? <SectionLoading label="Loading mockups" /> : isError ? <Button type="button" variant="outline" onClick={() => refetch()}>Reload mockups</Button> : !visibleAssets?.length ? <p className="text-muted-foreground text-sm">No mockups yet. Upload images in Apply Mockup.</p> : visibleAssets.map(asset => <MockupCard key={asset.id} asset={asset} artworkGroups={artworkGroups} review={review} selectable={!review && !isRunning} selected={selected.includes(asset.id)} onSelect={choose} />)}
    {review && run?.status === "waiting_for_input" && <Button type="button" disabled={isActing} onClick={() => action({ runId: run.id, expectedRevision: run.revision, action: "resume_mockups" })}>Continue with approved mockups</Button>}
  </div>;
};
