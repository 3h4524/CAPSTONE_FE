"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { MockupTemplatePickerContent } from "@/components/batch-setup/mockup-template/mockup-template-picker-content";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NodeControl } from "@/components/workflows/nodes/node-control";
import { countProductTypes } from "@/helpers/mockup-template";
import {
  readString,
  readStringArray,
  readTemplateBackgrounds,
  readTemplateColors,
} from "@/helpers/workflow-config";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNode } from "@/types/workflow";
import { cn } from "@/utils/cn";

type NodeMockupFieldProps = {
  nodeId: string;
  data: WorkflowNode["data"];
  disabled?: boolean;
};

export const NodeMockupField = ({ nodeId, data, disabled = false }: NodeMockupFieldProps) => {
  const [open, setOpen] = useState(false);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const batchId = useWorkflowStore((state) => {
    const input = state.nodes.find((node) => node.data.type === "product-input");
    return readString(input?.data.config.batchId);
  });
  const runJob = useWorkflowRunStore((state) => state.job);
  const { data: templates, isPending, isError } = useMockupTemplates(undefined, open);
  const { data: products } = useBatchProducts(batchId);
  const selectedIds = readStringArray(data.config.mockupTemplateIds);
  const colors = [
    ...new Set(
      Object.entries(readTemplateColors(data.config.templateColors))
        .filter(([templateId]) => selectedIds.includes(templateId))
        .flatMap(([, list]) => list)
    ),
  ];
  const sampleDesignUrl =
    runJob?.batchId === batchId
      ? runJob.products.find((product) => product.images.length > 0)?.images[0]?.imageUrl
      : undefined;
  const pendingProducts = products?.filter((product) => product.status === "pending") ?? [];
  const productTypeCounts =
    pendingProducts.length > 0
      ? countProductTypes(pendingProducts)
      : runJob?.batchId === batchId
        ? countProductTypes(runJob.products)
        : products
          ? countProductTypes(products)
          : undefined;
  const counts = productTypeCounts && Object.keys(productTypeCounts).length > 0 ? productTypeCounts : undefined;
  const label =
    selectedIds.length > 0
      ? `${selectedIds.length} ${selectedIds.length === 1 ? "template" : "templates"}`
      : "Choose mock-up templates";

  return (
    <>
      <NodeControl>
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-label="Choose mock-up templates"
          onClick={() => setOpen(true)}
          className={cn(
            "border-wf-line bg-wf-muted/50 hover:border-wf-accent/50 flex h-8 w-full min-w-0 items-center gap-2 rounded-md border px-2.5 text-left text-[11px] leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            selectedIds.length > 0 ? "text-wf-ink font-medium" : "text-wf-faint"
          )}
        >
          {selectedIds.length > 0 ? (
            <Pencil className="size-3 shrink-0" aria-hidden="true" />
          ) : (
            <Plus className="size-3 shrink-0" aria-hidden="true" />
          )}
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {colors.length > 0 && (
            <span className="text-wf-faint ml-auto flex shrink-0 items-center gap-1 text-[10px]">
              <span
                className="border-wf-surface size-2.5 rounded-full border-2 shadow-[0_0_0_1px_var(--wf-line)]"
                style={{ backgroundColor: colors[0] }}
                aria-hidden="true"
              />
              {colors.length}
            </span>
          )}
        </button>
      </NodeControl>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-4xl flex-col overflow-hidden p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Choose mock-up templates</DialogTitle>
            <DialogDescription>
              Pick the templates and garment colors this step uses. Changes apply to this node only.
            </DialogDescription>
          </DialogHeader>
          {isPending ? (
            <p className="text-muted-foreground text-sm">Loading mock-up templates…</p>
          ) : isError ? (
            <p className="text-muted-foreground text-sm">Mock-up templates could not be loaded.</p>
          ) : templates ? (
            <MockupTemplatePickerContent
              templates={templates}
              initialIds={selectedIds}
              initialTemplateColors={readTemplateColors(data.config.templateColors)}
              initialTemplateBackgrounds={readTemplateBackgrounds(data.config.templateBackgrounds)}
              pending={false}
              productTypeCounts={counts}
              sampleDesignUrl={sampleDesignUrl}
              onApply={(nextIds, nextColors, nextBackgrounds) => {
                updateNodeConfig(nodeId, {
                  ...data.config,
                  mockupTemplateIds: nextIds,
                  templateColors: nextColors,
                  templateBackgrounds: nextBackgrounds,
                });
                setOpen(false);
              }}
              onClose={() => setOpen(false)}
            />
          ) : (
            <p className="text-muted-foreground text-sm">No mock-up templates are available yet.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
