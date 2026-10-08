"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { MockupTemplatePickerContent } from "@/components/batch-setup/mockup-template/mockup-template-picker-content";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { defaultTemplateColors, type TemplateColors } from "@/helpers/garment-colors";
import { countProductTypes } from "@/helpers/mockup-template";
import { readTemplateColors } from "@/helpers/workflow-config";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNodeConfig } from "@/types/workflow";

type MockupSelectionFieldProps = {
  /** Config key of the colors chosen per template. */
  templateColorsName: string;
  value: string[];
  onChange: (templateIds: string[]) => void;
};

// The batch the workflow reads from decides which product types the templates must cover.
const useWorkflowBatchId = () =>
  useWorkflowStore((state) => {
    const batchId = state.nodes.find((node) => node.data.type === "product-input")?.data.config.batchId;
    return typeof batchId === "string" ? batchId : "";
  });

export const MockupSelectionField = ({ templateColorsName, value, onChange }: MockupSelectionFieldProps) => {
  const [open, setOpen] = useState(false);
  const { control, setValue } = useFormContext<WorkflowNodeConfig>();
  const templateColors = readTemplateColors(useWatch({ control, name: templateColorsName }));
  const batchId = useWorkflowBatchId();
  const runJob = useWorkflowRunStore((state) => state.job);
  // A generated design of the batch's latest run, shown in each template's print area while choosing.
  const sampleDesignUrl = runJob?.batchId === batchId ? runJob.products.find((product) => product.images.length > 0)?.images[0]?.imageUrl : undefined;
  const { data: templates, isPending, isError } = useMockupTemplates();
  const { data: products } = useBatchProducts(batchId);
  const selectedTemplates = (templates ?? []).filter((template) => value.includes(template.id));

  // Only the product types the run will make mock-ups for are offered: the pending products if there
  // are any, else the ones in the run being viewed, else everything in the batch.
  const pendingProducts = products?.filter((product) => product.status === "pending") ?? [];
  const productTypeCounts =
    pendingProducts.length > 0
      ? countProductTypes(pendingProducts)
      : runJob?.batchId === batchId
        ? countProductTypes(runJob.products)
        : products
          ? countProductTypes(products)
          : undefined;

  const apply = (templateIds: string[], colorsByTemplate: TemplateColors) => {
    onChange(templateIds);
    setValue(templateColorsName, colorsByTemplate, { shouldDirty: true, shouldValidate: true });
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {selectedTemplates.length > 0 ? (
        <ul className="space-y-1.5 rounded-lg border p-2 text-xs" aria-label="Selected mock-up templates">
          {selectedTemplates.map((template) => {
            const colors = template.allowRecolor ? (templateColors[template.id] ?? defaultTemplateColors(template)) : [];
            return (
              <li key={template.id} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{template.name}</span>
                  {colors.map((hex) => (
                    <GarmentColorSwatch key={hex} hex={hex} />
                  ))}
                </span>
                <span className="text-muted-foreground shrink-0">{template.productType}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-xs">No template chosen yet.</p>
      )}
      <Button type="button" variant="outline" size="sm" className="w-full" disabled={isPending || isError} onClick={() => setOpen(true)}>
        {value.length === 0 ? "Choose templates" : "Change templates"}
      </Button>
      {isError && <p className="text-xs text-rose-700" role="alert">Mock-up templates could not be loaded.</p>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-4xl flex-col overflow-hidden">
          <DialogHeader className="text-left">
            <DialogTitle>Choose mock-up templates</DialogTitle>
            <DialogDescription>
              Tick at least one template for each product type in the batch. Each design is rendered on every selected template of its own type.
            </DialogDescription>
          </DialogHeader>
          {templates ? (
            <MockupTemplatePickerContent
              templates={templates}
              initialIds={value}
              initialTemplateColors={templateColors}
              pending={false}
              productTypeCounts={productTypeCounts && Object.keys(productTypeCounts).length > 0 ? productTypeCounts : undefined}
              sampleDesignUrl={sampleDesignUrl}
              onApply={apply}
              onClose={() => setOpen(false)}
            />
          ) : (
            <SectionLoading label="Loading mock-up templates" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
