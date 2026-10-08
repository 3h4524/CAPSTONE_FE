"use client";

import { useEffect } from "react";
import { Trash2, X } from "lucide-react";
import { useForm } from "react-hook-form";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VideoTemplateCards } from "@/components/workflows/config-panel/fields/video-template-cards";
import { NodeConfigField } from "@/components/workflows/config-panel/node-config-field";
import { MockupPanel } from "@/components/workflows/media/mockup-panel";
import { RunStatusPanel } from "@/components/workflows/media/run-status-panel";
import { StoryboardPanel } from "@/components/workflows/media/storyboard-panel";
import { VideoReviewPanel } from "@/components/workflows/media/video-review-panel";
import { VideoSourcesHeader } from "@/components/workflows/media/video-sources-header";
import { WORKFLOW_CATEGORIES, WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import { readString } from "@/helpers/workflow-config";
import { hasVideoSteps, isVideoRunNode } from "@/helpers/workflow-run";
import { workflowNodeConfigSchemas } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode, WorkflowNodeConfig } from "@/types/workflow";
import { cn } from "@/utils/cn";
import { zodResolver } from "@hookform/resolvers/zod";

type NodeConfigFormProps = {
  node: WorkflowNode;
};

export const NodeConfigForm = ({ node }: NodeConfigFormProps) => {
  const definition = WORKFLOW_NODE_DEFINITIONS[node.data.type];
  const category = WORKFLOW_CATEGORIES.find((item) => item.id === definition.category);
  const Icon = definition.icon;
  const isRunning = useWorkflowStore((state) => state.isRunning);
  // Only the video's review unlocks the video settings; a design review leaves them as they are.
  const waitingReview = useWorkflowStore(state => state.nodes.some(n => n.data.type === "review-video" && n.data.status === "waiting_for_review"));
  const hasVideo = useWorkflowStore(state => hasVideoSteps(state.nodes));
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const selectNode = useWorkflowStore((state) => state.selectNode);

  const form = useForm<WorkflowNodeConfig, unknown, WorkflowNodeConfig>({
    resolver: zodResolver(workflowNodeConfigSchemas[node.data.type]),
    defaultValues: node.data.config,
    mode: "onChange",
  });
  const { control, trigger, watch, setValue } = form;
  const videoTemplate = readString(watch("template")) || "auto";
  const videoFields = definition.fields.filter(field => field.name === "mode" || field.name === "outputFormat" || field.name === "durationSeconds");
  const advancedVideoFields = definition.fields.filter(field => field.name === "textOverlay" || field.name === "standardOptions.transition");

  useEffect(() => {
    void trigger();
    const subscription = watch((values, { name }) => {
      if (!name) return;
      const root = name.split(".")[0];
      const current = useWorkflowStore.getState().nodes.find(n => n.id === node.id);
      if (root && current) {
        updateNodeConfig(node.id, { ...current.data.config, [root]: values[root] });
        if (root === "batchId" && current.data.config.batchId !== values.batchId) setValue("productId", "", { shouldDirty: true, shouldValidate: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [node.id, trigger, watch, updateNodeConfig, setValue]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-2.5 border-b px-4 py-3">
        <Icon className={cn("mt-0.5 size-5 shrink-0", category?.iconClassName)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-slate-900">{node.data.label}</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">{definition.description}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Close node settings" onClick={() => selectNode(null)}>
          <X aria-hidden="true" />
        </Button>
      </div>
      {/* Radix lays the content out as a table that grows to its widest line; block keeps it inside the panel. */}
      <ScrollArea className="min-h-0 flex-1 [&>[data-radix-scroll-area-viewport]>div]:block!">
        <Form {...form}>
          <form onSubmit={(event) => event.preventDefault()} className="p-4">
            <fieldset disabled={isRunning && !(waitingReview && node.data.type === "generate-video")} className="space-y-5">
              {node.data.type === "generate-video" ? <>
                {videoFields.filter(field => field.name === "mode").map(field => <NodeConfigField key={field.name} field={field} control={control} />)}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Video template</p>
                  <VideoTemplateCards value={videoTemplate} disabled={isRunning && !waitingReview} onChange={(code, version) => {
                    setValue("template", code, { shouldDirty: true, shouldValidate: true });
                    setValue("templateVersion", version, { shouldDirty: true, shouldValidate: true });
                  }} />
                </div>
                {videoFields.filter(field => field.name !== "mode").map(field => <NodeConfigField key={field.name} field={field} control={control} />)}
                <Accordion type="single" collapsible>
                  <AccordionItem value="advanced-video">
                    <AccordionTrigger>Caption and transition</AccordionTrigger>
                    <AccordionContent className="space-y-5">
                      {advancedVideoFields.map(field => <NodeConfigField key={field.name} field={field} control={control} />)}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </> : definition.fields.map(field => <NodeConfigField key={field.name} field={field} control={control} />)}
            </fieldset>
          </form>
        </Form>
        <div className="space-y-4 px-4 pb-4">{isVideoRunNode(node.data.type) && <RunStatusPanel />}
          {node.data.type === "apply-mockup" && hasVideo && <>
            <VideoSourcesHeader description="Choose which of this product's mock-ups the video may use, or upload finished mock-up photos. Leave all unchecked to let the video pick." />
            <MockupPanel review={false} />
          </>}
          {node.data.type === "approval-gate" && <>
            <VideoSourcesHeader description="Approve the mock-ups to use in the video. The ones made by Apply mock-up are added here when the video part starts." />
            <MockupPanel review />
          </>}
          {node.data.type === "generate-video" && <StoryboardPanel node={node} />}
          {(node.data.type === "review-video" || node.data.type === "generate-video") && <VideoReviewPanel />}
        </div>
      </ScrollArea>
      <div className="border-t p-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive w-full"
          onClick={() => removeNode(node.id)}
          disabled={isRunning}
        >
          <Trash2 aria-hidden="true" />
          Delete node
        </Button>
      </div>
    </div>
  );
};
