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
import { hasPrintifyDownstream, type MockupTarget } from "@/helpers/workflow-graph";
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
  /** Config key of what the mock-ups are for: "zip" or "printify". */
  targetName: string;
  value: string[];
  onChange: (templateIds: string[]) => void;
};

const TARGETS: { value: MockupTarget; label: string }[] = [
  { value: "zip", label: "ZIP export only" },
  { value: "printify", label: "Printify product" },
];

// A Push to Printify step after Apply mock-up decides what the mock-ups are for, whatever the node says.
const usePrintifyLocked = () =>
  useWorkflowStore((state) => {
    const node = state.nodes.find((item) => item.data.type === "apply-mockup");
    return node ? hasPrintifyDownstream(node.id, state.nodes, state.edges) : false;
  });

// The batch the workflow reads from decides which product types the templates must cover.
const useWorkflowBatchId = () =>
  useWorkflowStore((state) => {
    const batchId = state.nodes.find((node) => node.data.type === "product-input")?.data.config.batchId;
    return typeof batchId === "string" ? batchId : "";
  });

export const MockupSelectionField = ({ templateColorsName, templateBackgroundsName, targetName, value, onChange }: MockupSelectionFieldProps) => {
  const [open, setOpen] = useState(false);
  const { control, setValue } = useFormContext<WorkflowNodeConfig>();
  const templateColors = readTemplateColors(useWatch({ control, name: templateColorsName }));
  const templateBackgrounds = readTemplateBackgrounds(useWatch({ control, name: templateBackgroundsName }));
  const printifyLocked = usePrintifyLocked();
  const storedTarget: MockupTarget = useWatch({ control, name: targetName }) === "printify" ? "printify" : "zip";
  const target: MockupTarget = printifyLocked ? "printify" : storedTarget;
  const printify = target === "printify";
  const batchId = useWorkflowBatchId();
  const runJob = useWorkflowRunStore((state) => state.job);
  // A generated design of the batch's latest run, shown in each template's print area while choosing.
  const sampleDesignUrl = runJob?.batchId === batchId ? runJob.products.find((product) => product.images.length > 0)?.images[0]?.imageUrl : undefined;
  const { data: templates, isPending, isError } = useMockupTemplates();
  const { data: products } = useBatchProducts(batchId);
  const selectedTemplates = (templates ?? []).filter((template) => value.includes(template.id));
  // A Printify product needs exactly one template linked to Printify.
  const printifyProblem = !printify || isPending || !templates
    ? null
    : selectedTemplates.some((template) => !template.printify)
      ? "A chosen template is not linked to Printify. Change templates and pick a Printify one."
      : selectedTemplates.length !== 1
        ? "Choose exactly one Printify template."
        : null;

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
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-700">The mock-ups are for</p>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1" role="radiogroup" aria-label="What the mock-ups are for">
          {TARGETS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={target === option.value}
              disabled={printifyLocked && option.value !== "printify"}
              onClick={() => setValue(targetName, option.value, { shouldDirty: true, shouldValidate: true })}
              className={cn(
                "rounded-md px-2 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                target === option.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          {printifyLocked
            ? "Push to Printify is connected, so the mock-ups show the Printify product: one Printify template, in its Printify colors."
            : printify
              ? "One Printify template, in its Printify colors, so the mock-ups show what Printify prints."
              : "Any templates and colors; the mock-ups go into the ZIP."}
        </p>
      </div>
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
                          <GarmentColorSwatch key={hex} hex={hex} className="size-3" palette={template.printify?.colors} />
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
        <PanelEmptyState icon={Shirt} title="No template chosen yet." description="Each approved design is placed on the template chosen for its product type." className="py-5" />
      )}
      {isError && <PanelNotice tone="error">Mock-up templates could not be loaded.</PanelNotice>}
      {printifyProblem && <PanelNotice tone="warning">{printifyProblem}</PanelNotice>}
      <Button type="button" variant="outline" size="sm" className="w-full hover:translate-y-0" disabled={isPending || isError} onClick={() => setOpen(true)}>
        {value.length === 0 ? <Plus aria-hidden="true" /> : <Pencil aria-hidden="true" />}
        {value.length === 0 ? "Choose templates" : "Change templates"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-4xl flex-col overflow-hidden">
          <DialogHeader className="text-left">
            <DialogTitle>{printify ? "Choose a Printify template" : "Choose mock-up templates"}</DialogTitle>
            <DialogDescription>
              {printify
                ? "Tick the Printify product the designs are printed on. Its print area and colors are Printify's own."
                : "Tick one template for each product type in the batch. Each design is rendered on the template of its own type."}
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
              printifyOnly={printify}
            />
          ) : (
            <SectionLoading label="Loading mock-up templates" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
