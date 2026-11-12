"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Check, ExternalLink, Film, Loader2, Pencil, X } from "lucide-react";

import { runGroupKeys } from "@/api/run-groups";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { ModelPhotoMockupForm } from "@/components/workflows/media/model-photo-mockup-form";
import {
  MockupStripCard,
  MockupStripSkeleton,
  ScrollStrip,
} from "@/components/workflows/run/mockup-strip";
import { confirmRunGroupAiShot, makesAiClips } from "@/helpers/confirm-ai-shot";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast, showWorkflowActionToast } from "@/helpers/toast";
import { useReviewMockupAsset } from "@/hooks/mutations/use-review-mockup-asset";
import { useCancelRunGroup, useConfirmRunGroup } from "@/hooks/mutations/use-run-group-actions";
import { useAiVideoTemplates } from "@/hooks/queries/use-ai-video-templates";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useSyncGeneratedMockups } from "@/hooks/use-sync-generated-mockups";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";
import type {
  GenerateVideoConfig,
  MockupAsset,
  RunGroup,
  RunGroupTarget,
} from "@/types/video-workflow";
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

export const runStatusOf = (status: string | null) =>
  RUN_STATUS[status ?? ""] ?? { label: status ?? "", className: "bg-slate-100 text-slate-700" };

/** The mock-ups of one design: its own artwork group, without the AI keyframes made for a scene. */
export const designMockups = (
  assets: MockupAsset[] | undefined,
  target: Pick<RunGroupTarget, "productId" | "artworkGroupKey">
) =>
  (assets ?? []).filter(
    (asset) =>
      (asset.artworkGroupKey ?? asset.productId) === target.artworkGroupKey &&
      asset.role !== "VideoScene"
  );

const byProduct = (targets: RunGroupTarget[]) => {
  const groups = new Map<string, RunGroupTarget[]>();
  targets.forEach((target) =>
    groups.set(target.productId, [...(groups.get(target.productId) ?? []), target])
  );
  return [...groups.values()];
};

// Mockup Approval of a batch video run: the run's products, each with the mock-ups of its approved design (Design
// approval keeps one per product). A product whose mock-ups are approved gets a video; Continue starts them. Once
// started, it shows how each video is doing.
export const RunGroupPanel = () => {
  const groupId = useRunGroupId();
  const { data: group, isPending, isError, refetch } = useRunGroup(groupId);
  if (!groupId) return null;
  if (isPending)
    return <p className="text-muted-foreground text-xs">Loading the designs of this run…</p>;
  if (isError || !group)
    return (
      <PanelNotice
        tone="error"
        action={
          <button type="button" className="underline" onClick={() => refetch()}>
            Try again
          </button>
        }
      >
        The designs of this run could not be loaded.
      </PanelNotice>
    );
  return group.status === "waiting_for_targets" ? (
    <ChooseDesigns group={group} />
  ) : (
    <GroupProgress group={group} />
  );
};

const ChooseDesigns = ({ group }: { group: RunGroup }) => {
  const { mutate: confirm, isPending: isConfirming } = useConfirmRunGroup();
  const { mutate: cancel, isPending: isCancelling } = useCancelRunGroup();
  const { selectRun } = useWorkflowRuntime();
  const [isQuoting, setIsQuoting] = useState(false);
  const sharedVideoConfig = useWorkflowStore(
    (state) => state.nodes.find((node) => node.data.type === "generate-video")?.data.config
  );
  const isDirty = useWorkflowStore((state) => state.isDirty);
  const designScope = useWorkflowStore((state) => state.designScope);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const tooMany = group.selectedCount > group.maximumTargets;
  const blocked = group.targets.filter((target) => target.selected && target.resolveError);
  const warningCount = group.targets
    .filter((target) => target.selected)
    .reduce((sum, target) => sum + target.warnings.length, 0);
  // Mock-ups made again by Apply mock-up since the group started are stored here, so they replace the older ones.
  const isSyncing = useSyncGeneratedMockups(group.id, [
    ...new Set(group.targets.map((target) => target.productId)),
  ]);
  // A design follows the saved scene list unless it has settings of its own; either may make paid AI clips.
  const shared = sharedVideoConfig as GenerateVideoConfig | undefined;
  const isPaid = group.targets.some(
    (target) => target.selected && makesAiClips(target.config ?? shared)
  );
  const { data: aiTemplates } = useAiVideoTemplates();
  const showsModelPhoto = showsPerson(
    [shared, ...group.targets.map((target) => target.config ?? undefined)],
    new Set((aiTemplates ?? []).filter((item) => item.requiresLifestyle).map((item) => item.code))
  );

  const start = async () => {
    let token: string | undefined;
    if (isPaid) {
      setIsQuoting(true);
      try {
        const confirmed = await confirmRunGroupAiShot(group.id, group.revision);
        if (confirmed === null) return;
        token = confirmed;
      } catch (error) {
        showToast("error", getErrorMessage(error));
        return;
      } finally {
        setIsQuoting(false);
      }
    }
    confirm(
      { groupId: group.id, expectedRevision: group.revision, aiShotQuoteToken: token },
      {
        onSuccess: (started) => {
          showWorkflowActionToast(
            "success",
            `${started.progress.total} video${started.progress.total === 1 ? "" : "s"} started.`
          );
          // The canvas follows the first design's run; the bar above it switches to the others.
          const first = started.targets.find((target) => target.runId)?.runId;
          if (first) selectRun(first);
        },
      }
    );
  };

  if (group.targets.length === 0)
    return (
      <PanelNotice tone="warning">
        No product of this run has mock-ups for a video yet. Add mock-ups with Apply mock-up, or
        upload finished photos to a product.
      </PanelNotice>
    );

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs leading-relaxed">
        Approve the mock-ups of each product that should get a video. Every chosen product uses the
        scenes of Generate Video; a product without a matching image uses its main mock-up. A scene
        that shows a person uses the product&apos;s approved model photo.
      </p>
      {isSyncing && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs" role="status">
          <Loader2
            className="size-3.5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          Adding the mock-ups made since this run started…
        </p>
      )}
      <div className="space-y-3">
        {byProduct(group.targets).map((targets) => (
          <ProductSection
            key={targets[0].productId}
            group={group}
            targets={targets}
            showsModelPhoto={showsModelPhoto}
          />
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
                const video = useWorkflowStore
                  .getState()
                  .nodes.find((node) => node.data.type === "generate-video");
                if (video) selectNode(video.id);
              }}
            >
              Open Generate Video
            </button>
          }
        >
          {warningCount} scene{warningCount === 1 ? "" : "s"} could not use the image you chose and
          will use another one.
        </PanelNotice>
      )}
      {tooMany && (
        <PanelNotice tone="error">
          {group.selectedCount} designs are chosen; one run makes at most {group.maximumTargets}{" "}
          videos. Reject the mock-ups of the designs to leave out.
        </PanelNotice>
      )}
      {blocked.length > 0 && (
        <PanelNotice tone="error">
          <ul className="space-y-1">
            {blocked.map((target) => (
              <li key={target.key}>
                <span className="font-medium">{target.productName}</span>: {target.resolveError}
              </li>
            ))}
          </ul>
        </PanelNotice>
      )}
      {isPaid && blocked.length === 0 && (
        <PanelNotice tone="info">
          These videos have AI scenes. Continue shows what the clips of every chosen product cost
          together, and nothing is generated until you accept it.
        </PanelNotice>
      )}
      {isDirty && (
        <PanelNotice tone="warning">
          {designScope
            ? `Save first: the videos use saved settings, and Save keeps the changes for ${designScope.label} only.`
            : "Save the workflow first: the videos use the saved scenes."}
        </PanelNotice>
      )}
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
          disabled={
            group.selectedCount === 0 ||
            tooMany ||
            blocked.length > 0 ||
            isDirty ||
            isConfirming ||
            isQuoting ||
            isCancelling
          }
          onClick={start}
        >
          {isQuoting
            ? "Checking cost…"
            : isConfirming
              ? "Starting…"
              : isPaid
                ? "Continue (AI)"
                : "Continue"}
        </Button>
      </div>
    </div>
  );
};

// One product and the mock-ups of its design in a strip, so the whole run can be reviewed without opening anything.
// A product with mock-ups from more than one source (its design and uploaded photos, or several designs approved
// before a product kept only one) lists each under a header.
const ProductSection = ({
  group,
  targets,
  showsModelPhoto = false,
}: {
  group: RunGroup;
  targets: RunGroupTarget[];
  showsModelPhoto?: boolean;
}) => {
  const client = useAppQueryClient();
  const productId = targets[0].productId;
  const { data: assets, isPending, dataUpdatedAt } = useMockupAssets(productId);
  const videos = targets.filter((target) => target.selected).length;

  // A review changes which designs get a video: read the group again, once for the product rather than per design.
  const firstUpdate = useRef(dataUpdatedAt);
  useEffect(() => {
    if (dataUpdatedAt === firstUpdate.current) return;
    void client.invalidateQueries({ queryKey: runGroupKeys.detail(group.id) });
  }, [client, dataUpdatedAt, group.id]);

  const single = targets.length === 1;

  return (
    <section
      className="bg-card overflow-hidden rounded-xl border shadow-[0_1px_3px_rgba(39,55,80,0.06)]"
      aria-label={targets[0].productName}
    >
      {!single && (
        <header className="bg-muted/40 flex items-center gap-2 border-b px-3 py-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
            {targets[0].productName}
          </h3>
          <span className="text-muted-foreground shrink-0 text-xs">
            {targets.length} design{targets.length === 1 ? "" : "s"} · {videos} video
            {videos === 1 ? "" : "s"}
          </span>
        </header>
      )}
      <ul className="divide-y">
        {targets.map((target) => (
          <DesignRow
            key={target.key}
            target={target}
            mockups={designMockups(assets, target)}
            isLoading={isPending}
            asProduct={single}
          />
        ))}
      </ul>
      {showsModelPhoto && (
        <details className="border-t">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
            Put {targets[0].productName} on a model photo
          </summary>
          <div className="border-t bg-slate-50/50 p-3">
            <ModelPhotoMockupForm productId={productId} assets={assets ?? []} />
          </div>
        </details>
      )}
    </section>
  );
};

/** Whether any of these settings has a scene that shows a person, so each product needs its own model photo. */
export const showsPerson = (
  configs: (GenerateVideoConfig | undefined)[],
  personTemplates: Set<string>
) =>
  configs.some((config) =>
    config?.aiScenes?.some(
      (scene) => scene.mode !== "standard" && personTemplates.has(scene.templateCode)
    )
  );

/** The 1-based scenes of the video that start from each mock-up of a chosen design, by mock-up id. */
export const scenesByMockup = (target: Pick<RunGroupTarget, "selected" | "scenes">) => {
  const found = new Map<string, number[]>();
  if (!target.selected) return found;
  for (const scene of target.scenes) {
    if (!scene.mockupId) continue;
    found.set(scene.mockupId, [...(found.get(scene.mockupId) ?? []), scene.sceneIndex + 1]);
  }
  return found;
};

/**
 * The mock-ups with the ones the video starts from first, in scene order; the rest keep their order. The used ones
 * come first so they are in view without scrolling, and so the strip reads like the video does.
 */
export const usedFirst = (mockups: MockupAsset[], used: Map<string, number[]>) => {
  const sceneOf = (asset: MockupAsset) => used.get(asset.id)?.[0] ?? Number.MAX_SAFE_INTEGER;
  return [...mockups].sort((left, right) => sceneOf(left) - sceneOf(right));
};

// A design's mock-ups. As the only one of its product (`asProduct`), the row stands for the product: it is titled
// with the product's name and skipping it leaves the product without a video.
const DesignRow = ({
  target,
  mockups: unordered,
  isLoading,
  asProduct = false,
}: {
  target: RunGroupTarget;
  mockups: MockupAsset[];
  isLoading: boolean;
  asProduct?: boolean;
}) => {
  const { mutateAsync: review } = useReviewMockupAsset();
  const [isReviewing, setIsReviewing] = useState(false);
  const usedScenes = scenesByMockup(target);
  const mockups = usedFirst(unordered, usedScenes);
  const usedCount = mockups.filter((asset) => usedScenes.has(asset.id)).length;

  const reviewAll = async (approved: boolean) => {
    setIsReviewing(true);
    try {
      for (const asset of mockups.filter(
        (item) => item.approvalStatus !== (approved ? "approved" : "rejected")
      ))
        await review({ id: asset.id, revision: asset.revision, approved });
    } catch (error) {
      showWorkflowActionToast("error", getErrorMessage(error));
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <li className="space-y-2 py-3">
      <div className="flex items-center gap-3 px-3">
        <Thumbnail url={target.previewUrl} label={target.designLabel} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm", asProduct ? "font-semibold" : "font-medium")}>
            {asProduct ? target.productName : target.designLabel}
          </p>
          <p className="text-muted-foreground text-xs">
            {asProduct ? `${target.designLabel} · ` : ""}
            {target.approvedCount}/{target.mockupCount} mock-ups approved
            {target.pendingCount > 0 ? ` · ${target.pendingCount} to review` : ""}
          </p>
          {target.mockupCount > 0 && (
            <div
              className="bg-muted mt-1.5 h-1 max-w-48 overflow-hidden rounded-full"
              role="progressbar"
              aria-label="Mock-ups approved"
              aria-valuemin={0}
              aria-valuemax={target.mockupCount}
              aria-valuenow={target.approvedCount}
            >
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${(target.approvedCount / target.mockupCount) * 100}%` }}
              />
            </div>
          )}
          {target.selected && (
            <p className="text-secondary mt-1.5 flex items-center gap-1 text-xs font-medium">
              <Film className="size-3 shrink-0" aria-hidden="true" />
              {target.scenes.length === 0
                ? "The video picks from the approved mock-ups"
                : `The video starts from ${usedCount} image${usedCount === 1 ? "" : "s"}`}
            </p>
          )}
        </div>
        {target.hasOverride && (
          <Badge variant="outline" className="gap-1">
            <Pencil className="size-3" aria-hidden="true" />
            Own scenes
          </Badge>
        )}
        {target.selected && target.warnings.length > 0 && (
          <AlertTriangle
            className="size-4 shrink-0 text-amber-600"
            aria-label={`${target.warnings.length} warnings`}
          />
        )}
        <Badge
          className={cn(
            "shrink-0 gap-1.5 border",
            target.selected
              ? "border-primary/15 bg-primary/10 text-primary"
              : "border-border bg-muted text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              target.selected ? "bg-primary" : "bg-muted-foreground/50"
            )}
            aria-hidden="true"
          />
          {target.selected ? "Video" : "No video"}
        </Badge>
      </div>

      {(target.resolveError || target.warnings.length > 0) && (
        <div className="space-y-2 px-3">
          {target.resolveError && <PanelNotice tone="error">{target.resolveError}</PanelNotice>}
          {target.warnings.length > 0 && (
            <PanelNotice tone="warning">
              <ul className="space-y-0.5">
                {target.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </PanelNotice>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 px-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary h-8 gap-1.5 px-2.5 text-xs hover:translate-y-0"
          disabled={isReviewing || isLoading || mockups.length === 0}
          onClick={() => reviewAll(true)}
        >
          <Check className="size-3.5" aria-hidden="true" />
          Approve all
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-muted-foreground h-8 gap-1.5 px-2.5 text-xs hover:translate-y-0"
          title={`Reject every mock-up of this ${asProduct ? "product" : "design"} so it gets no video`}
          disabled={isReviewing || isLoading || mockups.length === 0}
          onClick={() => reviewAll(false)}
        >
          <X className="size-3.5" aria-hidden="true" />
          {asProduct ? "Skip product" : "Skip design"}
        </Button>
      </div>

      {isLoading ? (
        <MockupStripSkeleton />
      ) : mockups.length === 0 ? (
        <p className="text-muted-foreground px-3 text-xs">
          This {asProduct ? "product" : "design"} has no mock-ups yet.
        </p>
      ) : (
        <ScrollStrip
          label={`Mock-ups of ${asProduct ? target.productName : target.designLabel}`}
          itemCount={mockups.length}
        >
          {mockups.map((asset) => (
            <MockupStripCard key={asset.id} asset={asset} />
          ))}
        </ScrollStrip>
      )}
    </li>
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
        {group.status === "cancelled"
          ? "Stopped"
          : group.status === "completed"
            ? "All videos finished"
            : "Making the videos"}{" "}
        ·{" "}
        <span className="text-muted-foreground font-normal">
          {progress.completed} done, {progress.waitingForReview} to review
          {progress.failed > 0 ? `, ${progress.failed} failed` : ""} of {progress.total}
        </span>
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div
          className="bg-primary h-full transition-[width]"
          style={{
            width: `${progress.total ? ((finished + progress.waitingForReview) / progress.total) * 100 : 0}%`,
          }}
        />
      </div>
      <ul className="divide-y rounded-lg border">
        {group.targets.map((target) => {
          const status = runStatusOf(target.runStatus);
          const isOpen = Boolean(target.runId) && target.runId === runId;
          return (
            <li key={target.key} className={cn(isOpen && "bg-primary/5")}>
              <div className="flex items-center gap-3 px-3 py-2">
                <Thumbnail url={target.previewUrl} label={target.designLabel} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {target.productName} · {target.designLabel}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {target.runStatus === "running" && target.stage
                      ? `${target.stage} · ${target.progress}%`
                      : (target.runError ?? status.label)}
                  </span>
                </span>
                <Badge className={cn("shrink-0", status.className)}>{status.label}</Badge>
                {target.runId && (
                  <Button
                    type="button"
                    size="sm"
                    variant={isOpen ? "secondary" : "ghost"}
                    className="gap-1"
                    onClick={() => selectRun(target.runId!)}
                  >
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                    {isOpen ? "Open" : "View"}
                  </Button>
                )}
              </div>
              <ApprovedMockups target={target} />
            </li>
          );
        })}
      </ul>
      {group.status === "running" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isCancelling}
          onClick={() => cancel({ groupId: group.id, expectedRevision: group.revision })}
        >
          Stop all videos
        </Button>
      )}
    </div>
  );
};

/**
 * The mock-ups approved for a design whose video has started, read only: the review at Mockup Approval stays in view
 * after it. The product's mock-ups are read once for all its designs.
 */
const ApprovedMockups = ({ target }: { target: RunGroupTarget }) => {
  const { data: assets, isPending } = useMockupAssets(target.productId);
  const approved = designMockups(assets, target).filter(
    (asset) => asset.approvalStatus === "approved"
  );
  if (isPending) return <MockupStripSkeleton />;
  if (approved.length === 0) return null;
  return (
    <div className="space-y-1.5 pb-1">
      <p className="text-muted-foreground px-3 text-xs">
        {approved.length} approved mock-up{approved.length === 1 ? "" : "s"}
      </p>
      <ScrollStrip
        label={`Approved mock-ups of ${target.productName} · ${target.designLabel}`}
        itemCount={approved.length}
      >
        {approved.map((asset) => (
          <MockupStripCard key={asset.id} asset={asset} readOnly />
        ))}
      </ScrollStrip>
    </div>
  );
};

export const Thumbnail = ({
  url,
  label,
  className,
}: {
  url: string | null;
  label: string;
  className?: string;
}) =>
  url ? (
    <Image
      src={url}
      alt={label}
      width={40}
      height={40}
      unoptimized
      className={cn("size-10 shrink-0 rounded border bg-slate-50 object-contain", className)}
    />
  ) : (
    <span
      className={cn("size-10 shrink-0 rounded border bg-slate-50", className)}
      aria-hidden="true"
    />
  );
