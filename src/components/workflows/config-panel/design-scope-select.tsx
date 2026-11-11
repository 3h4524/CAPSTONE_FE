"use client";

import { useEffect } from "react";
import { Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { runStatusOf } from "@/components/workflows/run/run-group-panel";
import { showWorkflowActionToast } from "@/helpers/toast";
import { useUpdateRunGroupDesignConfig } from "@/hooks/mutations/use-run-group-actions";
import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";
import type { RunGroup, RunGroupTarget } from "@/types/video-workflow";
import type { WorkflowNodeConfig } from "@/types/workflow";

const FIELD_ID = "video-design-scope";

/** The designs that get a video: before the videos start, the ones with an approved mock-up; then each one's run. */
export const videoDesigns = (group: RunGroup) =>
  group.status === "waiting_for_targets"
    ? group.targets.filter((target) => target.selected)
    : group.targets.filter((target) => target.runId);

/**
 * At the top of Generate Video while a batch video run is open: whose video settings the panel shows. "All products"
 * is the workflow's shared settings; a product shows its own, every field of the node included, and edits them there.
 * Before the videos start, Save stores a chosen product's settings for it instead of in the workflow (see
 * `useWorkflowSave`); once its video exists, choosing it opens its run, as the bar above the canvas does, and the
 * changes apply when it is re-rendered.
 */
export const DesignScopeSelect = ({ nodeId }: { nodeId: string }) => {
  const groupId = useRunGroupId();
  const { data: group } = useRunGroup(groupId);
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const scope = useWorkflowStore((state) => state.designScope);
  const nodeConfig = useWorkflowStore((state) => state.nodes.find((node) => node.id === nodeId)?.data.config);
  const enter = useWorkflowStore((state) => state.enterDesignScope);
  const leave = useWorkflowStore((state) => state.leaveDesignScope);
  const { runId, selectRun } = useWorkflowRuntime();
  const { mutate: storeDesign, isPending } = useUpdateRunGroupDesignConfig();

  const active = group && group.workflowId === workflowId ? group : null;
  const waiting = active?.status === "waiting_for_targets";
  const designs = active ? videoDesigns(active) : [];
  const target = scope ? active?.targets.find((candidate) => candidate.key === scope.key) : undefined;
  const unsaved = Boolean(scope && nodeConfig && JSON.stringify(nodeConfig) !== JSON.stringify(scope.baseConfig));

  const show = (next: RunGroupTarget, config: WorkflowNodeConfig) =>
    enter(
      {
        key: next.key,
        productId: next.productId,
        artworkGroupKey: next.artworkGroupKey,
        label: next.productName,
        runId: next.runId,
      },
      config
    );
  const sharedConfig = () => useWorkflowStore.getState().designScope?.sharedConfig ?? nodeConfig ?? {};

  const open = (next: RunGroupTarget) => {
    show(next, (next.config as WorkflowNodeConfig | null) ?? sharedConfig());
    if (next.runId && next.runId !== runId) selectRun(next.runId);
  };

  // Once the videos exist, the panel follows the design whose run the canvas shows, chosen here or in the bar above.
  useEffect(() => {
    if (!active || active.status === "waiting_for_targets" || !runId) return;
    const followed = active.targets.find((candidate) => candidate.runId === runId);
    if (!followed?.config || followed.key === useWorkflowStore.getState().designScope?.key) return;
    show(followed, followed.config as WorkflowNodeConfig);
    // `show` is rebuilt every render; the design to follow only changes with the run and the group.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, runId]);

  if (!active || designs.length === 0) return null;

  const choose = (value: string) => {
    if (value === (scope?.key ?? "")) return;
    if (unsaved && scope && !window.confirm(`Discard the unsaved changes to ${scope.label}?`)) return;
    if (!value) {
      leave();
      return;
    }
    const next = designs.find((candidate) => candidate.key === value);
    if (next) open(next);
  };

  const useShared = () => {
    if (!scope || !target) return;
    const shared = sharedConfig();
    if (!target.hasOwnConfig) {
      show(target, shared);
      return;
    }
    storeDesign(
      {
        groupId: active.id,
        expectedRevision: active.revision,
        productId: scope.productId,
        artworkGroupKey: scope.artworkGroupKey,
        config: null,
      },
      {
        onSuccess: () => {
          show(target, shared);
          showWorkflowActionToast("success", `${scope.label} uses the shared video settings again.`);
        },
      }
    );
  };

  const options = designs.map((design) => ({
    value: design.key,
    label: design.productName,
    hint: waiting ? (design.hasOwnConfig ? "Own settings" : "Shared settings") : runStatusOf(design.runStatus).label,
    imageUrl: design.previewUrl,
  }));

  return (
    <section className="space-y-2.5 rounded-lg border bg-slate-50/70 p-3" aria-label="Which product's video settings">
      <Label htmlFor={FIELD_ID}>Video product</Label>
      <OptionSelect
        standaloneId={FIELD_ID}
        value={scope?.key ?? ""}
        options={options}
        placeholder="All products"
        noneLabel="All products (shared settings)"
        onChange={choose}
        disabled={isPending}
      />
      {!scope ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Every product uses these settings. Choose a product to see its video settings and give it its own.
        </p>
      ) : waiting ? (
        <>
          <PanelNotice tone={unsaved ? "warning" : "info"}>
            {unsaved
              ? `Unsaved changes to ${scope.label}. Save keeps them for this product only; the shared settings stay as they are.`
              : target?.hasOwnConfig
                ? `${scope.label} has its own settings. Everything below applies to this product only.`
                : `${scope.label} follows the shared settings. Change anything below and Save keeps it for this product only.`}
          </PanelNotice>
          {(target?.hasOwnConfig || unsaved) && (
            <Button type="button" size="sm" variant="outline" className="gap-1.5 hover:translate-y-0" disabled={isPending} onClick={useShared}>
              {isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <RotateCcw className="size-3.5" aria-hidden="true" />}
              Use shared settings
            </Button>
          )}
        </>
      ) : (
        <PanelNotice tone="info">
          {`These are the settings ${scope.label}'s video was made with. Change them, then re-render this video from the review below.`}
        </PanelNotice>
      )}
    </section>
  );
};
