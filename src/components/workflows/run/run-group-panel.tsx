"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Check, ExternalLink, Film, Loader2, Pencil, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { runGroupKeys } from "@/api/run-groups";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { ModelPhotoMockupForm } from "@/components/workflows/media/model-photo-mockup-form";
import {
  MockupStripCard,
  MockupStripSkeleton,
  ModelPhotoPendingCard,
  ScrollStrip,
} from "@/components/workflows/run/mockup-strip";
import { getErrorMessage } from "@/helpers/error-message";
import { showWorkflowActionToast } from "@/helpers/toast";
import { hasVideoSteps } from "@/helpers/workflow-run";
import { useReviewMockupAsset } from "@/hooks/mutations/use-review-mockup-asset";
import {
  useCancelRunGroup,
  useConfirmRunGroup,
  useResumeRunGroup,
} from "@/hooks/mutations/use-run-group-actions";
import { useAiVideoTemplates } from "@/hooks/queries/use-ai-video-templates";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import { usePanelContinueCommand } from "@/hooks/use-panel-continue-command";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useSyncGeneratedMockups } from "@/hooks/use-sync-generated-mockups";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { i18n } from "@/i18n/client";
import { useWorkflowStore } from "@/stores/workflow";
import type {
  GenerateVideoConfig,
  MockupAsset,
  RunGroup,
  RunGroupTarget,
} from "@/types/video-workflow";
import { cn } from "@/utils/cn";

const RUN_STATUS: Record<string, string> = {
  queued: "bg-ink-100 text-ink-700",
  running: "bg-sky-100 text-sky-800",
  waiting_for_input: "bg-amber-100 text-amber-900",
  waiting_for_review: "bg-violet-100 text-violet-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
  cancelled: "bg-ink-100 text-ink-500",
};

export const runStatusOf = (status: string | null) => {
  const className = RUN_STATUS[status ?? ""];
  if (!className) return { label: status ?? "", className: "bg-ink-100 text-ink-700" };
  return { label: i18n.t(`workflowEditor.runGroup.runStatuses.${status}`), className };
};

/** Whether the workflow makes a video: the run-group panel words what follows Mockup Approval after it. */
const useWithVideo = () => useWorkflowStore((state) => hasVideoSteps(state.nodes));

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

// Mockup Approval of a batch run: the run's products, each with the mock-ups of its approved design (Design approval
// keeps one per product). A product whose mock-ups are approved goes on (gets its video, or is published and gets its
// listing without one); Continue starts them. Once started, it shows how each run is doing.
export const RunGroupPanel = () => {
  const { t } = useTranslation("common");
  const groupId = useRunGroupId();
  const { data: group, isPending, isError, refetch } = useRunGroup(groupId);
  if (!groupId) return null;
  if (isPending)
    return (
      <p className="text-muted-foreground text-xs">{t("workflowEditor.runGroup.loadingDesigns")}</p>
    );
  if (isError || !group)
    return (
      <PanelNotice
        tone="error"
        action={
          <button type="button" className="underline" onClick={() => refetch()}>
            {t("workflowEditor.workspace.tryAgain")}
          </button>
        }
      >
        {t("workflowEditor.runGroup.loadError")}
      </PanelNotice>
    );
  return group.status === "waiting_for_targets" ? (
    <ChooseDesigns group={group} />
  ) : (
    <GroupProgress group={group} />
  );
};

const ChooseDesigns = ({ group }: { group: RunGroup }) => {
  const { t } = useTranslation("common");
  const { mutate: confirm, isPending: isConfirming } = useConfirmRunGroup();
  const { mutate: cancel, isPending: isCancelling } = useCancelRunGroup();
  const { selectRun } = useWorkflowRuntime();
  const withVideo = useWithVideo();
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
  // A design follows the saved scene list unless it has settings of its own.
  const shared = sharedVideoConfig as GenerateVideoConfig | undefined;
  const { data: aiTemplates } = useAiVideoTemplates();
  const showsModelPhoto = showsPerson(
    [shared, ...group.targets.map((target) => target.config ?? undefined)],
    new Set((aiTemplates ?? []).filter((item) => item.requiresLifestyle).map((item) => item.code))
  );

  // The cost, AI clips included, was shown when the seller pressed Run: Continue starts at once.
  const start = () => {
    confirm(
      { groupId: group.id, expectedRevision: group.revision },
      {
        onSuccess: (started) => {
          showWorkflowActionToast(
            "success",
            withVideo
              ? t("workflowEditor.runGroup.videosStarted", { count: started.progress.total })
              : t("workflowEditor.runGroup.runsStarted", { count: started.progress.total })
          );
          // The canvas follows the first design's run; the bar above it switches to the others.
          const first = started.targets.find((target) => target.runId)?.runId;
          if (first) selectRun(first);
        },
      }
    );
  };

  // A design held up by a missing model photo does not lock Continue: Continue makes that photo again first.
  // Continue waits only for what it needs. An automatic Mockup Approval is started by the server once it has made
  // everything, so it is left alone until then. A manual one can go on with the designs whose model photo is done,
  // and only a chosen design whose photo is still being made holds it back.
  const automaticApproval = useWorkflowStore(
    (state) => state.nodes.find((node) => node.data.type === "approval-gate")?.data.config.mode === "auto"
  );
  const waitingForPhotos = group.targets.some(
    (target) => target.selected && target.modelPhoto === "pending"
  );
  const canStart =
    group.selectedCount > 0 &&
    !tooMany &&
    !isDirty &&
    !isConfirming &&
    !isCancelling &&
    !waitingForPhotos &&
    !(group.preparing === true && automaticApproval);
  usePanelContinueCommand(canStart, start);

  if (group.targets.length === 0)
    return (
      <PanelNotice tone="warning">
        {withVideo
          ? t("workflowEditor.runGroup.noMockupsVideo")
          : t("workflowEditor.runGroup.noMockups")}
      </PanelNotice>
    );

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs leading-relaxed">
        {withVideo ? t("workflowEditor.runGroup.introVideo") : t("workflowEditor.runGroup.intro")}
      </p>
      {isSyncing && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs" role="status">
          <Loader2
            className="size-3.5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          {t("workflowEditor.runGroup.syncing")}
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
              {t("workflowEditor.runGroup.openGenerateVideo")}
            </button>
          }
        >
          {t("workflowEditor.runGroup.sceneWarnings", { count: warningCount })}
        </PanelNotice>
      )}
      {group.preparing && (
        <PanelNotice tone="info">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            {!automaticApproval
              ? t("workflowEditor.runGroup.preparingManual")
              : withVideo
                ? t("workflowEditor.runGroup.preparingVideo")
                : t("workflowEditor.runGroup.preparing")}
          </span>
        </PanelNotice>
      )}
      {group.notice && (
        <PanelNotice tone="warning">
          {group.status === "waiting_for_targets"
            ? `${withVideo ? t("workflowEditor.runGroup.autoNotStartedVideo") : t("workflowEditor.runGroup.autoNotStarted")} ${group.notice}`
            : group.notice}
        </PanelNotice>
      )}
      {tooMany && (
        <PanelNotice tone="error">
          {withVideo
            ? t("workflowEditor.runGroup.tooManyVideo", {
                selected: group.selectedCount,
                maximum: group.maximumTargets,
              })
            : t("workflowEditor.runGroup.tooMany", {
                selected: group.selectedCount,
                maximum: group.maximumTargets,
              })}
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
      {isDirty && (
        <PanelNotice tone="warning">
          {designScope
            ? t("workflowEditor.runGroup.saveFirstScope", { label: designScope.label })
            : withVideo
              ? t("workflowEditor.runGroup.saveFirstVideo")
              : t("workflowEditor.runGroup.saveFirst")}
        </PanelNotice>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <p className="mr-auto text-sm font-medium">
          {withVideo
            ? t("workflowEditor.runGroup.videosWillBeMade", { count: group.selectedCount })
            : t("workflowEditor.runGroup.productsWillContinue", { count: group.selectedCount })}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isCancelling || isConfirming}
          onClick={() => cancel({ groupId: group.id, expectedRevision: group.revision })}
        >
          {t("workflowEditor.runGroup.cancel")}
        </Button>
        <Button type="button" size="sm" disabled={!canStart} onClick={start}>
          {isConfirming
            ? t("workflowEditor.runGroup.starting")
            : t("workflowEditor.runGroup.continue")}
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
  const { t } = useTranslation("common");
  const client = useAppQueryClient();
  const productId = targets[0].productId;
  const { data: assets, isPending, dataUpdatedAt } = useMockupAssets(productId);
  const videos = targets.filter((target) => target.selected).length;
  const withVideo = useWithVideo();

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
            {t("workflowEditor.runGroup.designCount", { count: targets.length })} ·{" "}
            {withVideo
              ? t("workflowEditor.runGroup.videoCount", { count: videos })
              : t("workflowEditor.runGroup.chosenCount", { count: videos })}
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
            withVideo={withVideo}
          />
        ))}
      </ul>
      {showsModelPhoto && (
        <details className="border-t">
          <summary className="text-ink-700 hover:bg-ink-50 cursor-pointer px-3 py-2 text-xs font-medium">
            {t("workflowEditor.runGroup.putOnModelPhoto", { name: targets[0].productName })}
          </summary>
          <div className="bg-ink-50/50 border-t p-3">
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
  withVideo = true,
}: {
  target: RunGroupTarget;
  mockups: MockupAsset[];
  isLoading: boolean;
  asProduct?: boolean;
  /** Off for a workflow without a video: an approved design goes on to the next steps instead. */
  withVideo?: boolean;
}) => {
  const { t } = useTranslation("common");
  const { mutateAsync: review } = useReviewMockupAsset();
  const [isReviewing, setIsReviewing] = useState(false);
  const usedScenes = scenesByMockup(target);
  const mockups = usedFirst(unordered, usedScenes);
  const usedCount = mockups.filter((asset) => usedScenes.has(asset.id)).length;
  const photoPending = target.modelPhoto === "pending";

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
            {t("workflowEditor.runGroup.mockupsApprovedOf", {
              approved: target.approvedCount,
              total: target.mockupCount,
            })}
            {target.pendingCount > 0
              ? ` · ${t("workflowEditor.runGroup.toReviewCount", { count: target.pendingCount })}`
              : ""}
          </p>
          {target.mockupCount > 0 && (
            <div
              className="bg-muted mt-1.5 h-1 max-w-48 overflow-hidden rounded-full"
              role="progressbar"
              aria-label={t("workflowEditor.runGroup.mockupsApproved")}
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
          {target.selected && withVideo && (
            <p className="text-secondary mt-1.5 flex items-center gap-1 text-xs font-medium">
              <Film className="size-3 shrink-0" aria-hidden="true" />
              {target.scenes.length === 0
                ? t("workflowEditor.runGroup.videoPicks")
                : t("workflowEditor.runGroup.videoStartsFrom", { count: usedCount })}
            </p>
          )}
        </div>
        {target.hasOverride && (
          <Badge variant="outline" className="gap-1">
            <Pencil className="size-3" aria-hidden="true" />
            {t("workflowEditor.runGroup.ownScenes")}
          </Badge>
        )}
        {target.selected && target.warnings.length > 0 && (
          <AlertTriangle
            className="size-4 shrink-0 text-amber-600"
            aria-label={t("workflowEditor.runGroup.warnings", { count: target.warnings.length })}
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
          {withVideo
            ? target.selected
              ? t("workflowEditor.runGroup.video")
              : t("workflowEditor.runGroup.noVideo")
            : target.selected
              ? t("workflowEditor.runGroup.included")
              : t("workflowEditor.runGroup.skipped")}
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
          {t("workflowEditor.runGroup.approveAll")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-muted-foreground h-8 gap-1.5 px-2.5 text-xs hover:translate-y-0"
          title={t(
            asProduct
              ? withVideo
                ? "workflowEditor.runGroup.rejectProductVideo"
                : "workflowEditor.runGroup.rejectProduct"
              : withVideo
                ? "workflowEditor.runGroup.rejectDesignVideo"
                : "workflowEditor.runGroup.rejectDesign"
          )}
          disabled={isReviewing || isLoading || mockups.length === 0}
          onClick={() => reviewAll(false)}
        >
          <X className="size-3.5" aria-hidden="true" />
          {asProduct
            ? t("workflowEditor.runGroup.skipProduct")
            : t("workflowEditor.runGroup.skipDesign")}
        </Button>
      </div>

      {isLoading ? (
        <MockupStripSkeleton />
      ) : mockups.length === 0 && !photoPending ? (
        <p className="text-muted-foreground px-3 text-xs">
          {asProduct
            ? t("workflowEditor.runGroup.productNoMockups")
            : t("workflowEditor.runGroup.designNoMockups")}
        </p>
      ) : (
        <ScrollStrip
          label={t("workflowEditor.runGroup.mockupsOf", {
            name: asProduct ? target.productName : target.designLabel,
          })}
          itemCount={mockups.length + (photoPending ? 1 : 0)}
        >
          {mockups.map((asset) => (
            <MockupStripCard key={asset.id} asset={asset} />
          ))}
          {/* The model photo is still being made: its card takes the place the photo will have. */}
          {photoPending && <ModelPhotoPendingCard />}
        </ScrollStrip>
      )}
      {target.modelPhoto === "missing" && (
        <p className="px-3 text-xs text-amber-700 dark:text-amber-400">
          {t("workflowEditor.runGroup.modelPhotoMissing")}
        </p>
      )}
    </li>
  );
};

const GroupProgress = ({ group }: { group: RunGroup }) => {
  const { t } = useTranslation("common");
  const { selectRun, runId } = useWorkflowRuntime();
  const { mutate: cancel, isPending: isCancelling } = useCancelRunGroup();
  const { mutate: resume, isPending: isResuming } = useResumeRunGroup();
  const withVideo = useWithVideo();
  const { progress } = group;
  const finished = progress.completed + progress.failed + progress.cancelled;
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {group.status === "cancelled"
          ? t("workflowEditor.runGroup.stopped")
          : group.status === "completed"
            ? withVideo
              ? t("workflowEditor.runGroup.allVideosFinished")
              : t("workflowEditor.runGroup.allRunsFinished")
            : withVideo
              ? t("workflowEditor.runGroup.makingVideos")
              : t("workflowEditor.runGroup.running")}{" "}
        ·{" "}
        <span className="text-muted-foreground font-normal">
          {progress.failed > 0
            ? t("workflowEditor.runGroup.progressWithFailed", {
                completed: progress.completed,
                waiting: progress.waitingForReview,
                failed: progress.failed,
                total: progress.total,
              })
            : t("workflowEditor.runGroup.progress", {
                completed: progress.completed,
                waiting: progress.waitingForReview,
                total: progress.total,
              })}
        </span>
      </p>
      <div className="bg-ink-100 h-1.5 overflow-hidden rounded-full" aria-hidden="true">
        <div
          className="bg-primary h-full transition-[width]"
          style={{
            width: `${progress.total ? ((finished + progress.waitingForReview) / progress.total) * 100 : 0}%`,
          }}
        />
      </div>
      <ul className="divide-y rounded-lg border">
        {group.targets.map((target) => {
          const found = runStatusOf(target.runStatus);
          const status =
            !withVideo && target.runStatus === "running"
              ? { ...found, label: t("workflowEditor.runGroup.running") }
              : found;
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
                    {isOpen ? t("workflowEditor.runGroup.open") : t("workflowEditor.runGroup.view")}
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
          {withVideo
            ? t("workflowEditor.runGroup.stopAllVideos")
            : t("workflowEditor.runGroup.stopAllRuns")}
        </Button>
      )}
      {group.status === "cancelled" && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-muted-foreground mr-auto text-xs">
            {t("workflowEditor.runGroup.resumeHint")}
          </p>
          <Button
            type="button"
            size="sm"
            disabled={isResuming}
            onClick={() =>
              resume(
                { groupId: group.id, expectedRevision: group.revision },
                {
                  onSuccess: () =>
                    showWorkflowActionToast("success", t("workflowEditor.runGroup.resumed")),
                }
              )
            }
          >
            {isResuming
              ? t("workflowEditor.runGroup.resuming")
              : t("workflowEditor.runGroup.resume")}
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * The mock-ups approved for a design whose video has started, read only: the review at Mockup Approval stays in view
 * after it. The product's mock-ups are read once for all its designs.
 */
const ApprovedMockups = ({ target }: { target: RunGroupTarget }) => {
  const { t } = useTranslation("common");
  const { data: assets, isPending } = useMockupAssets(target.productId);
  const approved = designMockups(assets, target).filter(
    (asset) => asset.approvalStatus === "approved"
  );
  if (isPending) return <MockupStripSkeleton />;
  if (approved.length === 0) return null;
  return (
    <div className="space-y-1.5 pb-1">
      <p className="text-muted-foreground px-3 text-xs">
        {t("workflowEditor.runGroup.approvedMockupCount", { count: approved.length })}
      </p>
      <ScrollStrip
        label={t("workflowEditor.runGroup.approvedMockupsOf", {
          product: target.productName,
          design: target.designLabel,
        })}
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
      className={cn("bg-ink-50 size-10 shrink-0 rounded border object-contain", className)}
    />
  ) : (
    <span
      className={cn("bg-ink-50 size-10 shrink-0 rounded border", className)}
      aria-hidden="true"
    />
  );
