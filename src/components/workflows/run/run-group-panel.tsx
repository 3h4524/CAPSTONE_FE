"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Check, ChevronDown, ChevronRight, ExternalLink, Pencil, X } from "lucide-react";

import { runGroupKeys } from "@/api/run-groups";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { MockupCard } from "@/components/workflows/media/mockup-card";
import { getErrorMessage } from "@/helpers/error-message";
import { showWorkflowActionToast } from "@/helpers/toast";
import { useReviewMockupAsset } from "@/hooks/mutations/use-review-mockup-asset";
import { useCancelRunGroup, useConfirmRunGroup } from "@/hooks/mutations/use-run-group-actions";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";
import type { MockupAsset, RunGroup, RunGroupTarget } from "@/types/video-workflow";
import { cn } from "@/utils/cn";

const RUN_STATUS: Record<string, { label: string; className: string }> = {
  queued: { label: "Queued", className: "bg-slate-100 text-slate-700" },
  running: { label: "Rendering", className: "bg-sky-100 text-sky-800" },
  waiting_for_input: { label: "Needs attention", className: "bg-amber-100 text-amber-900" },
  waiting_for_review: { label: "Ready to review", className: "bg-violet-100 text-violet-800" },
  completed: { label: "Done", className: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Failed", className: "bg-rose-100 text-rose-800" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-500" },
};

export const runStatusOf = (status: string | null) => RUN_STATUS[status ?? ""] ?? { label: status ?? "", className: "bg-slate-100 text-slate-700" };

/** The mock-ups of one design: its own artwork group, without the AI keyframes made for a scene. */
export const designMockups = (assets: MockupAsset[] | undefined, target: Pick<RunGroupTarget, "productId" | "artworkGroupKey">) =>
  (assets ?? []).filter((asset) => (asset.artworkGroupKey ?? asset.productId) === target.artworkGroupKey && asset.role !== "VideoScene");

const byProduct = (targets: RunGroupTarget[]) => {
  const groups = new Map<string, RunGroupTarget[]>();
  targets.forEach((target) => groups.set(target.productId, [...(groups.get(target.productId) ?? []), target]));
  return [...groups.values()];
};

// Mockup Approval of a batch video run: every design of the run's products, each with its mock-ups. A design whose
// mock-ups are approved gets a video; Continue starts them. Once started, it shows how each video is doing.
export const RunGroupPanel = () => {
  const groupId = useRunGroupId();
  const { data: group, isPending, isError, refetch } = useRunGroup(groupId);
  if (!groupId) return null;
  if (isPending) return <p className="text-muted-foreground text-xs">Loading the designs of this run…</p>;
  if (isError || !group)
    return (
      <PanelNotice tone="error" action={<button type="button" className="underline" onClick={() => refetch()}>Try again</button>}>
        The designs of this run could not be loaded.
      </PanelNotice>
    );
  return group.status === "waiting_for_targets" ? <ChooseDesigns group={group} /> : <GroupProgress group={group} />;
};

const ChooseDesigns = ({ group }: { group: RunGroup }) => {
  const { mutate: confirm, isPending: isConfirming } = useConfirmRunGroup();
  const { mutate: cancel, isPending: isCancelling } = useCancelRunGroup();
  const { selectRun } = useWorkflowRuntime();
  const isDirty = useWorkflowStore((state) => state.isDirty);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const [open, setOpen] = useState<string | null>(null);
  const tooMany = group.selectedCount > group.maximumTargets;
  const blocked = group.targets.filter((target) => target.selected && target.resolveError);
  const warningCount = group.targets.filter((target) => target.selected).reduce((sum, target) => sum + target.warnings.length, 0);

  if (group.targets.length === 0)
    return (
      <PanelNotice tone="warning">
        No product of this run has mock-ups for a video yet. Add mock-ups with Apply mock-up, or upload finished photos to a product.
      </PanelNotice>
    );

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs leading-relaxed">
        Approve the mock-ups of each design that should get a video. Every chosen design uses the scenes of Generate Video;
        a design without a matching image uses its main mock-up.
      </p>
      <div className="space-y-3">
        {byProduct(group.targets).map((targets) => (
          <div key={targets[0].productId} className="rounded-lg border">
            <p className="truncate border-b px-3 py-2 text-xs font-semibold">{targets[0].productName}</p>
            <ul className="divide-y">
              {targets.map((target) => (
                <DesignRow
                  key={target.key}
                  group={group}
                  target={target}
                  open={open === target.key}
                  onToggle={() => setOpen((current) => (current === target.key ? null : target.key))}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
      {warningCount > 0 && (
        <PanelNotice
          tone="warning"
          action={
            <button
              type="button"
              className="underline"
              onClick={() => {
                const video = useWorkflowStore.getState().nodes.find((node) => node.data.type === "generate-video");
                if (video) selectNode(video.id);
              }}
            >
              See the scenes of each design
            </button>
          }
        >
          {warningCount} scene{warningCount === 1 ? "" : "s"} could not use the image you chose and will use another one.
        </PanelNotice>
      )}
      {tooMany && (
        <PanelNotice tone="error">
          {group.selectedCount} designs are chosen; one run makes at most {group.maximumTargets} videos. Reject the mock-ups of the designs to leave out.
        </PanelNotice>
      )}
      {blocked.length > 0 && (
        <PanelNotice tone="error">
          {blocked.map((target) => `${target.productName} · ${target.designLabel}`).join(", ")} cannot be rendered with these scenes.
        </PanelNotice>
      )}
      {isDirty && <PanelNotice tone="warning">Save the workflow first: the videos use the saved scenes.</PanelNotice>}
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <p className="mr-auto text-sm font-medium">
          {group.selectedCount} video{group.selectedCount === 1 ? "" : "s"} will be made
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isCancelling || isConfirming}
          onClick={() => cancel({ groupId: group.id, expectedRevision: group.revision })}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={group.selectedCount === 0 || tooMany || blocked.length > 0 || isDirty || isConfirming || isCancelling}
          onClick={() =>
            confirm(
              { groupId: group.id, expectedRevision: group.revision },
              {
                onSuccess: (started) => {
                  showWorkflowActionToast("success", `${started.progress.total} video${started.progress.total === 1 ? "" : "s"} started.`);
                  // The canvas follows the first design's run; the bar above it switches to the others.
                  const first = started.targets.find((target) => target.runId)?.runId;
                  if (first) selectRun(first);
                },
              }
            )
          }
        >
          {isConfirming ? "Starting…" : "Continue"}
        </Button>
      </div>
    </div>
  );
};

const DesignRow = ({ group, target, open, onToggle }: { group: RunGroup; target: RunGroupTarget; open: boolean; onToggle: () => void }) => (
  <li>
    <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50" aria-expanded={open}>
      {open ? <ChevronDown className="size-4 shrink-0" aria-hidden="true" /> : <ChevronRight className="size-4 shrink-0" aria-hidden="true" />}
      <Thumbnail url={target.previewUrl} label={target.designLabel} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{target.designLabel}</span>
        <span className="text-muted-foreground block text-xs">
          {target.approvedCount}/{target.mockupCount} approved{target.pendingCount > 0 ? ` · ${target.pendingCount} to review` : ""}
        </span>
      </span>
      {target.hasOverride && <Badge variant="outline" className="gap-1"><Pencil className="size-3" aria-hidden="true" />Own scenes</Badge>}
      {target.selected && target.warnings.length > 0 && <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-label={`${target.warnings.length} warnings`} />}
      <Badge className={cn("shrink-0", target.selected ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600")}>
        {target.selected ? "Video" : "No video"}
      </Badge>
    </button>
    {open && <DesignMockups group={group} target={target} />}
  </li>
);

const DesignMockups = ({ group, target }: { group: RunGroup; target: RunGroupTarget }) => {
  const client = useAppQueryClient();
  const { data: assets, isPending, dataUpdatedAt } = useMockupAssets(target.productId);
  const { mutateAsync: review } = useReviewMockupAsset();
  const [isReviewing, setIsReviewing] = useState(false);
  const mockups = useMemo(() => designMockups(assets, target), [assets, target]);

  // A review changes which designs get a video: read the group again.
  const firstUpdate = useRef(dataUpdatedAt);
  useEffect(() => {
    if (dataUpdatedAt === firstUpdate.current) return;
    void client.invalidateQueries({ queryKey: runGroupKeys.detail(group.id) });
  }, [client, dataUpdatedAt, group.id]);

  const reviewAll = async (approved: boolean) => {
    setIsReviewing(true);
    try {
      for (const asset of mockups.filter((item) => item.approvalStatus !== (approved ? "approved" : "rejected")))
        await review({ id: asset.id, revision: asset.revision, approved });
    } catch (error) {
      showWorkflowActionToast("error", getErrorMessage(error));
    } finally {
      setIsReviewing(false);
    }
  };

  if (isPending) return <p className="text-muted-foreground px-3 pb-3 text-xs">Loading mock-ups…</p>;
  return (
    <div className="space-y-3 px-3 pb-3">
      {target.resolveError && <PanelNotice tone="error">{target.resolveError}</PanelNotice>}
      {target.warnings.length > 0 && (
        <PanelNotice tone="warning">
          <ul className="space-y-0.5">{target.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </PanelNotice>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={isReviewing || mockups.length === 0} onClick={() => reviewAll(true)}>
          <Check className="size-3.5" aria-hidden="true" />Approve all
        </Button>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={isReviewing || mockups.length === 0} onClick={() => reviewAll(false)}>
          <X className="size-3.5" aria-hidden="true" />No video for this design
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
        {mockups.map((asset) => (
          <MockupCard key={asset.id} asset={asset} selected={false} selectable={false} onSelect={() => {}} review />
        ))}
      </div>
    </div>
  );
};

const GroupProgress = ({ group }: { group: RunGroup }) => {
  const { selectRun, runId } = useWorkflowRuntime();
  const { mutate: cancel, isPending: isCancelling } = useCancelRunGroup();
  const { progress } = group;
  const finished = progress.completed + progress.failed + progress.cancelled;
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {group.status === "cancelled" ? "Stopped" : group.status === "completed" ? "All videos finished" : "Making the videos"} ·{" "}
        <span className="text-muted-foreground font-normal">
          {progress.completed} done, {progress.waitingForReview} to review{progress.failed > 0 ? `, ${progress.failed} failed` : ""} of {progress.total}
        </span>
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className="bg-primary h-full transition-[width]" style={{ width: `${progress.total ? ((finished + progress.waitingForReview) / progress.total) * 100 : 0}%` }} />
      </div>
      <ul className="divide-y rounded-lg border">
        {group.targets.map((target) => {
          const status = runStatusOf(target.runStatus);
          const isOpen = Boolean(target.runId) && target.runId === runId;
          return (
            <li key={target.key} className={cn("flex items-center gap-3 px-3 py-2", isOpen && "bg-primary/5")}>
              <Thumbnail url={target.previewUrl} label={target.designLabel} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{target.productName} · {target.designLabel}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {target.runStatus === "running" && target.stage ? `${target.stage} · ${target.progress}%` : target.runError ?? status.label}
                </span>
              </span>
              <Badge className={cn("shrink-0", status.className)}>{status.label}</Badge>
              {target.runId && (
                <Button type="button" size="sm" variant={isOpen ? "secondary" : "ghost"} className="gap-1" onClick={() => selectRun(target.runId!)}>
                  <ExternalLink className="size-3.5" aria-hidden="true" />{isOpen ? "Open" : "View"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {group.status === "running" && (
        <Button type="button" variant="outline" size="sm" disabled={isCancelling} onClick={() => cancel({ groupId: group.id, expectedRevision: group.revision })}>
          Stop all videos
        </Button>
      )}
    </div>
  );
};

export const Thumbnail = ({ url, label, className }: { url: string | null; label: string; className?: string }) =>
  url ? (
    <Image src={url} alt={label} width={40} height={40} unoptimized className={cn("size-10 shrink-0 rounded border bg-slate-50 object-contain", className)} />
  ) : (
    <span className={cn("size-10 shrink-0 rounded border bg-slate-50", className)} aria-hidden="true" />
  );
