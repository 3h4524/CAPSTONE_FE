"use client";

import { useState } from "react";
import Image from "next/image";
import { Pencil, Plus, Shirt } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import { MockupTemplatePickerContent } from "@/components/batch-setup/mockup-template/mockup-template-picker-content";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PanelEmptyState } from "@/components/workflows/config-panel/layout/panel-empty-state";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { defaultTemplateColors, type TemplateColors } from "@/helpers/garment-colors";
import type { TemplateBackgrounds } from "@/helpers/mockup-backgrounds";
import { countProductTypes, productTypeLabel } from "@/helpers/mockup-template";
import { readTemplateBackgrounds, readTemplateColors } from "@/helpers/workflow-config";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNodeConfig } from "@/types/workflow";
import { cn } from "@/utils/cn";

type MockupSelectionFieldProps = {
  /** Config key of the colors chosen per template. */
  templateColorsName: string;
  /** Config key of the background chosen per template. */
  templateBackgroundsName: string;
  value: string[];
  onChange: (templateIds: string[]) => void;
};

// The batch the workflow reads from decides which product types the templates must cover.
const useWorkflowBatchId = () =>
  useWorkflowStore((state) => {
    const batchId = state.nodes.find((node) => node.data.type === "product-input")?.data.config.batchId;
    return typeof batchId === "string" ? batchId : "";
  });

export const MockupSelectionField = ({ templateColorsName, templateBackgroundsName, value, onChange }: MockupSelectionFieldProps) => {
  const [open, setOpen] = useState(false);
  const { control, setValue } = useFormContext<WorkflowNodeConfig>();
  const templateColors = readTemplateColors(useWatch({ control, name: templateColorsName }));
  const templateBackgrounds = readTemplateBackgrounds(useWatch({ control, name: templateBackgroundsName }));
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

  const apply = (templateIds: string[], colorsByTemplate: TemplateColors, backgroundsByTemplate: TemplateBackgrounds) => {
    onChange(templateIds);
    setValue(templateColorsName, colorsByTemplate, { shouldDirty: true, shouldValidate: true });
    setValue(templateBackgroundsName, backgroundsByTemplate, { shouldDirty: true, shouldValidate: true });
    setOpen(false);
  };

  return (
    <div className="min-w-0 space-y-2">
      {isPending && value.length > 0 ? (
        <SectionLoading label="Loading mock-up templates" className="justify-start rounded-lg border px-3 py-3 [&_svg]:size-4 [&>span]:text-xs" />
      ) : selectedTemplates.length > 0 ? (
        <ul className="divide-y overflow-hidden rounded-lg border bg-white" aria-label="Selected mock-up templates">
          {selectedTemplates.map((template) => {
            const colors = template.allowRecolor ? (templateColors[template.id] ?? defaultTemplateColors(template)) : [];
            // Chosen for a product type the next run has nothing to make for: kept, but not used.
            const unused = productTypeCounts !== undefined && !(template.productType.toLowerCase() in productTypeCounts);
            return (
              <li key={template.id} className={cn("flex items-center gap-3 px-2.5 py-2", unused && "bg-slate-50/80")}>
                <Image
                  src={template.previewImageUrl ?? template.baseImageUrl}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className={cn("bg-muted size-10 shrink-0 rounded-md object-cover", unused && "opacity-60")}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium text-slate-900">{template.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">{productTypeLabel(template.productType)}</span>
                    {colors.length > 0 && (
                      <span className="flex items-center gap-1">
                        {colors.map((hex) => (
                          <GarmentColorSwatch key={hex} hex={hex} className="size-3" />
                        ))}
                      </span>
                    )}
                    {unused && <span className="text-xs font-medium text-amber-700">· not used in this run</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : isError ? null : (
        <PanelEmptyState icon={Shirt} title="No template chosen yet." description="Each approved design is placed on every chosen template of its product type." className="py-5" />
      )}
      {isError && <PanelNotice tone="error">Mock-up templates could not be loaded.</PanelNotice>}
      <Button type="button" variant="outline" size="sm" className="w-full hover:translate-y-0" disabled={isPending || isError} onClick={() => setOpen(true)}>
        {value.length === 0 ? <Plus aria-hidden="true" /> : <Pencil aria-hidden="true" />}
        {value.length === 0 ? "Choose templates" : "Change templates"}
      </Button>
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
              initialTemplateBackgrounds={templateBackgrounds}
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
