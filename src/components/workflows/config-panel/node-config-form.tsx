"use client";

import { useEffect } from "react";
import { Trash2, X } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NodeConfigField } from "@/components/workflows/config-panel/node-config-field";
import { WORKFLOW_CATEGORIES, WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
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
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const selectNode = useWorkflowStore((state) => state.selectNode);

  const form = useForm<WorkflowNodeConfig, unknown, WorkflowNodeConfig>({
    resolver: zodResolver(workflowNodeConfigSchemas[node.data.type]),
    defaultValues: node.data.config,
    mode: "onChange",
  });
  const { control, trigger, watch } = form;

  useEffect(() => {
    void trigger();
    const subscription = watch((values) => updateNodeConfig(node.id, { ...values }));
    return () => subscription.unsubscribe();
  }, [node.id, trigger, watch, updateNodeConfig]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b px-4 py-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", category?.accentClassName)}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-slate-900">{node.data.label}</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">{definition.description}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Close node settings" onClick={() => selectNode(null)}>
          <X aria-hidden="true" />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <Form {...form}>
          <form onSubmit={(event) => event.preventDefault()} className="p-4">
            <fieldset disabled={isRunning} className="space-y-5">
              {definition.fields.map((field) => (
                <NodeConfigField key={field.name} field={field} control={control} />
              ))}
            </fieldset>
          </form>
        </Form>
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
