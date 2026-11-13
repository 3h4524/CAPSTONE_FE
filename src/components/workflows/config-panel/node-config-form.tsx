"use client";

import { useEffect } from "react";
import { Lock } from "lucide-react";
import { useForm } from "react-hook-form";

import { Form } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ApprovalFlow } from "@/components/workflows/config-panel/approval-flow";
import { DesignOutputPreview } from "@/components/workflows/config-panel/design-output-preview";
import { DesignScopeSelect } from "@/components/workflows/config-panel/design-scope-select";
import { AiShotOptions } from "@/components/workflows/config-panel/fields/ai-shot-options";
import { PreviousRunsSelect } from "@/components/workflows/config-panel/fields/previous-runs-select";
import { VideoProductSelect } from "@/components/workflows/config-panel/fields/video-product-select";
import { PanelFooter } from "@/components/workflows/config-panel/layout/panel-footer";
import { PanelHeader } from "@/components/workflows/config-panel/layout/panel-header";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { PanelSection } from "@/components/workflows/config-panel/layout/panel-section";
import { PanelStats } from "@/components/workflows/config-panel/layout/panel-stats";
import { ListingContentResultPanel } from "@/components/workflows/config-panel/listing-content-result";
import { MockupApprovalResults } from "@/components/workflows/config-panel/mockup-approval-results";
import { NodeConfigField } from "@/components/workflows/config-panel/node-config-field";
import { OwnPromptNotice } from "@/components/workflows/config-panel/own-prompt-notice";
import { PlanLockNotice } from "@/components/workflows/config-panel/plan-lock-notice";
import { ProductScopeSelect } from "@/components/workflows/config-panel/product-scope-select";
import { PromptRecipe } from "@/components/workflows/config-panel/prompt-recipe";
import { EtsyPublishSettings, PrintifyPublishSettings } from "@/components/workflows/config-panel/publish-settings";
import { ReviewVideoResults } from "@/components/workflows/config-panel/review-video-results";
import { ModelPhotoSection } from "@/components/workflows/media/model-photo-section";
import { RunStatusPanel } from "@/components/workflows/media/run-status-panel";
import { StoryboardPanel } from "@/components/workflows/media/storyboard-panel";
import { VideoReviewPanel } from "@/components/workflows/media/video-review-panel";
import { WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import { NODE_PANEL_SECTIONS } from "@/constants/workflow-panel";
import { getVideoOutputFormat } from "@/helpers/video-output-formats";
import { readString } from "@/helpers/workflow-config";
import { groupPanelFields } from "@/helpers/workflow-panel";
import { hasVideoSteps, isVideoRunNode, showsInputProduct } from "@/helpers/workflow-run";
import { useRunGroupId } from "@/hooks/queries/use-run-group";
import { useNodeOverview } from "@/hooks/use-node-overview";
import { workflowNodeConfigSchemas } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowField, WorkflowNode, WorkflowNodeConfig, WorkflowNodeType } from "@/types/workflow";
import { zodResolver } from "@hookform/resolvers/zod";

type NodeConfigFormProps = {
  node: WorkflowNode;
  /** Off when the panel already shows the node's header above a Results/Settings switch. */
  showHeader?: boolean;
  /** Off when the panel shows the step's results in a tab of their own (Mockup Approval with a run open). */
  showResults?: boolean;
};

const isAiSceneConfig = (scene: unknown) =>
  typeof scene === "object" && scene !== null && "mode" in scene && scene.mode !== "standard";

export const NodeConfigForm = ({ node, showHeader = true, showResults = true }: NodeConfigFormProps) => {
  const definition = WORKFLOW_NODE_DEFINITIONS[node.data.type];
  const isRunning = useWorkflowStore((state) => state.isRunning);
  // Only the video's review unlocks the video settings; a design review leaves them as they are.
  const waitingReview = useWorkflowStore((state) =>
    state.nodes.some(
      (n) => n.data.type === "review-video" && n.data.status === "waiting_for_review"
    )
  );
  // A video workflow makes one video per design chosen at Mockup Approval, whatever its settings.
  const hasVideo = useWorkflowStore((state) => hasVideoSteps(state.nodes));
  const groupId = useRunGroupId();
  // Mockup Approval lets the mock-ups through to the video, or without one straight to the first publish step.
  const approvalLeadsTo = useWorkflowStore((state): WorkflowNodeType =>
    hasVideoSteps(state.nodes)
      ? "generate-video"
      : state.nodes.some((n) => n.data.type === "publish-printify")
        ? "publish-printify"
        : state.nodes.some((n) => n.data.type === "publish-etsy")
          ? "publish-etsy"
          : "generate-video"
  );
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const overview = useNodeOverview(node);
  const settingsLocked = isRunning && !(waitingReview && node.data.type === "generate-video");
  const isPublishNode = node.data.type === "publish-printify" || node.data.type === "publish-etsy";

  const form = useForm<WorkflowNodeConfig, unknown, WorkflowNodeConfig>({
    resolver: zodResolver(workflowNodeConfigSchemas[node.data.type]),
    defaultValues: node.data.config,
    mode: "onChange",
  });
  const { control, trigger, watch, setValue, reset, getValues } = form;
  const videoMode = watch("mode");
  const watchedScenes = watch("aiScenes");
  const configuredScenes = Array.isArray(watchedScenes) ? watchedScenes : [];
  const outputMode = configuredScenes.length
    ? configuredScenes.some(isAiSceneConfig)
      ? "ai_shot"
      : "standard"
    : videoMode;
  const videoFieldNamed = (name: string) => definition.fields.find((field) => field.name === name);
  // The output format leads, then the video template, then the transition and the scenes the template starts from.
  const videoFieldNode = (name: string) => {
    const field = videoFieldNamed(name);
    return field ? (
      <NodeConfigField
        key={field.name}
        field={field}
        control={control}
        videoMode={String(outputMode ?? "ai_shot")}
      />
    ) : null;
  };
  const showProduct = useWorkflowStore((state) => showsInputProduct(state.nodes));
  const panelFields =
    node.data.type === "product-input" && !showProduct
      ? definition.fields.filter((field) => field.name !== "productId")
      : definition.fields;
  const { grouped, rest } = groupPanelFields(panelFields, NODE_PANEL_SECTIONS[node.data.type]);
  const renderField = (field: WorkflowField) => (
    <NodeConfigField key={field.name} field={field} control={control} />
  );

  // The scene editor writes directly to the workflow store. Reset only when a
  // real external change arrives, so controls and both editors always open from
  // the latest saved configuration without discarding a field being edited here.
  useEffect(() => {
    if (JSON.stringify(getValues()) === JSON.stringify(node.data.config)) return;
    reset(node.data.config);
  }, [node.data.config, getValues, reset]);

  useEffect(() => {
    void trigger();
    const subscription = watch((values, { name }) => {
      if (!name) return;
      const root = name.split(".")[0];
      const current = useWorkflowStore.getState().nodes.find((n) => n.id === node.id);
      if (root && current) {
        updateNodeConfig(node.id, { ...current.data.config, [root]: values[root] });
        if (root === "batchId" && current.data.config.batchId !== values.batchId)
          setValue("productId", "", { shouldDirty: true, shouldValidate: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [node.id, trigger, watch, updateNodeConfig, setValue]);

  useEffect(() => {
    if (node.data.type !== "generate-video") return;
    const currentFormat = node.data.config.outputFormat;
    const sceneModes = node.data.config.aiScenes;
    const effectiveMode =
      Array.isArray(sceneModes) && sceneModes.length > 0
        ? sceneModes.some(isAiSceneConfig)
          ? "ai_shot"
          : "standard"
        : node.data.config.mode;
    const normalizedFormat = getVideoOutputFormat(currentFormat, effectiveMode).value;
    if (currentFormat !== normalizedFormat) {
      setValue("outputFormat", normalizedFormat, { shouldDirty: true, shouldValidate: true });
      updateNodeConfig(node.id, { ...node.data.config, outputFormat: normalizedFormat });
    }
  }, [node.id, node.data.config, node.data.type, updateNodeConfig, setValue]);

  return (
    <div className="bg-card flex h-full flex-col">
      {showHeader && <PanelHeader node={node} onClose={() => selectNode(null)} />}
      {/* Radix lays the content out as a table that grows to its widest line; block keeps it inside the panel. */}
      <ScrollArea className="min-h-0 flex-1 [&>[data-radix-scroll-area-viewport]>div]:block!">
        <PanelStats stats={overview} />
        {/* Outside the locked settings: the design whose settings are shown can be changed while a video renders. */}
        {/* Before a run, the products of the batch; while a batch video run is open, its designs. */}
        {node.data.type === "generate-video" && (
          <div className="px-5 pt-4 empty:hidden">
            {groupId ? <DesignScopeSelect nodeId={node.id} /> : <ProductScopeSelect nodeId={node.id} />}
          </div>
        )}
        <PlanLockNotice
          nodeType={node.data.type}
          config={node.data.config as Record<string, unknown>}
          disabled={settingsLocked}
          onFix={(patch) => {
            for (const [key, value] of Object.entries(patch)) {
              setValue(key, value as never, { shouldDirty: true, shouldValidate: true });
            }
          }}
        />
        {settingsLocked && definition.fields.length > 0 && (
          <div className="px-5 pt-4">
            <PanelNotice tone="info">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Lock className="size-3" aria-hidden="true" />
                Settings are locked while the run is in progress.
              </span>
            </PanelNotice>
          </div>
        )}
        {/* Above the template and art style it is about. */}
        {node.data.type === "prompt-synthesis" && <OwnPromptNotice className="mx-5 mt-4" />}
        <Form {...form}>
          <form onSubmit={(event) => event.preventDefault()}>
            {/* A fieldset is as wide as its widest line by default; min-w-0 keeps a long batch name inside the panel. */}
            <fieldset
              disabled={settingsLocked}
              className="@container min-w-0 [&>section:first-child]:border-t-0"
            >
              {node.data.type === "generate-video" ? (
                <div className="space-y-6 px-5 py-5">
                  <AiShotOptions
                    nodeId={node.id}
                    beforeTemplate={videoFieldNode("outputFormat")}
                    afterTemplate={videoFieldNode("standardOptions.transition")}
                    disabled={isRunning && !waitingReview}
                    onChange={(scenes, seconds, sharedInstructions) => {
                      const nextMode =
                        scenes.length > 0 && scenes.every((scene) => scene.mode === "standard")
                          ? "standard"
                          : "ai_shot";
                      setValue("mode", nextMode, { shouldDirty: true, shouldValidate: true });
                      setValue("aiScenes", scenes, { shouldDirty: true, shouldValidate: true });
                      setValue("aiGlobalInstructions", sharedInstructions ?? null, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setValue("durationSeconds", seconds, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      void trigger();
                    }}
                  />
                </div>
              ) : (
                <>
                  {grouped.map(({ section, fields }) => (
                    <PanelSection
                      key={section.title}
                      title={section.title}
                      description={section.description}
                    >
                      <div className="space-y-6">{fields.map(renderField)}</div>
                    </PanelSection>
                  ))}
                  {rest.length > 0 && (
                    <div className="space-y-6 px-5 py-5">{rest.map(renderField)}</div>
                  )}
                  {definition.fields.length === 0 && !isPublishNode && (
                    <p className="text-muted-foreground px-5 py-5 text-xs">
                      This step has no settings.
                    </p>
                  )}
                </>
              )}
            </fieldset>
          </form>
        </Form>
        {/* The publish steps read Printify's catalog and the Etsy shop, so they have panels of their own. */}
        {node.data.type === "publish-printify" && <PrintifyPublishSettings node={node} disabled={settingsLocked} />}
        {node.data.type === "publish-etsy" && <EtsyPublishSettings node={node} disabled={settingsLocked} />}
        {node.data.type === "product-input" && (
          <PreviousRunsSelect batchId={readString(node.data.config.batchId)} />
        )}
        {node.data.type === "prompt-synthesis" && <PromptRecipe config={node.data.config} />}
        {node.data.type === "design-image" && <DesignOutputPreview config={node.data.config} />}
        {node.data.type === "design-approval" && (
          <ApprovalFlow
            from="design-image"
            to="apply-mockup"
            automatic={node.data.config.mode === "auto"}
          />
        )}
        {node.data.type === "apply-mockup" && !hasVideo && (
          <PanelSection
            title="Model photos"
            description="Put this product's mock-ups on a photo of a person in a plain, light tee, without AI."
          >
            <ModelPhotoSection />
          </PanelSection>
        )}
        {node.data.type === "approval-gate" && (
          <>
            <ApprovalFlow from="apply-mockup" to={approvalLeadsTo} automatic={node.data.config.mode === "auto"} />
            {/* A video workflow lists the run's designs instead: only publishing without a video is for one product. */}
            {!hasVideo && (
              <PanelSection title="Product">
                <VideoProductSelect />
              </PanelSection>
            )}
            {showResults && <MockupApprovalResults />}
          </>
        )}
        {node.data.type === "review-video" && (
          <>
            <ApprovalFlow from="generate-video" to="export-zip" automatic={node.data.config.mode === "auto"} />
            {showResults && <ReviewVideoResults className="px-5 pb-5" />}
          </>
        )}
        {((isVideoRunNode(node.data.type) && node.data.type !== "approval-gate" && node.data.type !== "review-video") ||
          node.data.type === "generate-listing") && (
          <div className="space-y-4 px-5 pb-5">
            {isVideoRunNode(node.data.type) && node.data.type !== "generate-video" && (
              <RunStatusPanel />
            )}
            {node.data.type === "generate-listing" && <ListingContentResultPanel />}
            {node.data.type === "generate-video" && <StoryboardPanel node={node} />}
            {node.data.type === "generate-video" && <VideoReviewPanel />}
          </div>
        )}
      </ScrollArea>
      <PanelFooter node={node} />
    </div>
  );
};
