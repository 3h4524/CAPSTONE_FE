"use client";

import { useState } from "react";
import Image from "next/image";
import { Pencil, Plus, Shirt } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { MockupTemplatePickerContent } from "@/components/batch-setup/mockup-template/mockup-template-picker-content";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PanelEmptyState } from "@/components/workflows/config-panel/layout/panel-empty-state";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { defaultTemplateColors, type TemplateColors } from "@/helpers/garment-colors";
import type { TemplateBackgrounds } from "@/helpers/mockup-backgrounds";
import { countProductTypes, printifySelectionIssue, productTypeLabel, uncoveredProductTypes } from "@/helpers/mockup-template";
import { readTemplateBackgrounds, readTemplateColors, readTemplatePlacements } from "@/helpers/workflow-config";
import { hasPrintifyDownstream, type MockupTarget } from "@/helpers/workflow-graph";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { TemplatePlacements } from "@/types/mockup-templates";
import type { WorkflowNodeConfig } from "@/types/workflow";
import { cn } from "@/utils/cn";

type MockupSelectionFieldProps = {
  /** Config key of the colors chosen per template. */
  templateColorsName: string;
  /** Config key of the background chosen per template. */
  templateBackgroundsName: string;
  /** Config key of where this workflow puts the design on each template. */
  templatePlacementsName: string;
  /** Config key of what the mock-ups are for: "zip" or "printify". */
  targetName: string;
  value: string[];
  onChange: (templateIds: string[]) => void;
};

const TARGETS: { value: MockupTarget; labelKey: "zipOnly" | "printifyProduct" }[] = [
  { value: "zip", labelKey: "zipOnly" },
  { value: "printify", labelKey: "printifyProduct" },
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

export const MockupSelectionField = ({ templateColorsName, templateBackgroundsName, templatePlacementsName, targetName, value, onChange }: MockupSelectionFieldProps) => {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const { control, setValue } = useFormContext<WorkflowNodeConfig>();
  const templateColors = readTemplateColors(useWatch({ control, name: templateColorsName }));
  const templateBackgrounds = readTemplateBackgrounds(useWatch({ control, name: templateBackgroundsName }));
  const templatePlacements = readTemplatePlacements(useWatch({ control, name: templatePlacementsName }));
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
  const runTypes = productTypeCounts && Object.keys(productTypeCounts).length > 0 ? Object.keys(productTypeCounts) : null;
  const typeOf = (template: { productType: string }) => template.productType.toLowerCase();

  // Each product type of the run is made on one template linked to Printify; one chosen for another type is not used.
  const printifyIssue = !printify || isPending || !templates
    ? null
    : printifySelectionIssue(runTypes ? selectedTemplates.filter((template) => runTypes.includes(typeOf(template))) : selectedTemplates);
  const printifyProblem = printifyIssue === "notLinked"
    ? t("workflowConfig.mockupSelection.notLinkedToPrintify")
    : printifyIssue
      ? t("workflowConfig.mockupSelection.chooseOnePrintify")
      : null;
  // The batch has a product type no chosen template is for: its products would get no mock-up.
  const uncoveredTypes = runTypes && selectedTemplates.length > 0 && !printifyProblem
    ? uncoveredProductTypes(runTypes, selectedTemplates)
    : [];

  const apply = (templateIds: string[], colorsByTemplate: TemplateColors, backgroundsByTemplate: TemplateBackgrounds, placements: TemplatePlacements) => {
    onChange(templateIds);
    setValue(templateColorsName, colorsByTemplate, { shouldDirty: true, shouldValidate: true });
    setValue(templateBackgroundsName, backgroundsByTemplate, { shouldDirty: true, shouldValidate: true });
    setValue(templatePlacementsName, placements, { shouldDirty: true, shouldValidate: true });
    setOpen(false);
  };

  return (
    <div className="min-w-0 space-y-2">
      <div className="space-y-1.5">
        <p className="text-ink-700 text-xs font-medium">{t("workflowConfig.mockupSelection.mockupsAreFor")}</p>
        <div className="bg-ink-100 grid grid-cols-2 gap-1 rounded-lg p-1" role="radiogroup" aria-label={t("workflowConfig.mockupSelection.mockupsAreForAria")}>
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
                target === option.value ? "bg-card text-ink-900 shadow-sm" : "text-ink-600 hover:text-ink-900"
              )}
            >
              {t(`workflowConfig.mockupSelection.targets.${option.labelKey}`)}
            </button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          {printifyLocked
            ? t("workflowConfig.mockupSelection.printifyLockedHint")
            : printify
              ? t("workflowConfig.mockupSelection.printifyHint")
              : t("workflowConfig.mockupSelection.zipHint")}
        </p>
      </div>
      {isPending && value.length > 0 ? (
        <SectionLoading label={t("workflowConfig.mockupSelection.loadingTemplates")} className="justify-start rounded-lg border px-3 py-3 [&_svg]:size-4 [&>span]:text-xs" />
      ) : selectedTemplates.length > 0 ? (
        <ul className="bg-card divide-y overflow-hidden rounded-lg border" aria-label={t("workflowConfig.mockupSelection.selectedTemplates")}>
          {selectedTemplates.map((template) => {
            const colors = template.allowRecolor ? (templateColors[template.id] ?? defaultTemplateColors(template)) : [];
            // Chosen for a product type the next run has nothing to make for: kept, but not used.
            const unused = productTypeCounts !== undefined && !(template.productType.toLowerCase() in productTypeCounts);
            return (
              <li key={template.id} className={cn("flex items-center gap-3 px-2.5 py-2", unused && "bg-ink-50/80")}>
                <Image
                  src={template.previewImageUrl ?? template.baseImageUrl}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className={cn("bg-muted size-10 shrink-0 rounded-md object-cover", unused && "opacity-60")}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-ink-900 truncate text-sm font-medium">{template.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">{t(`batches.productTypes.${template.productType.toLowerCase()}`, { defaultValue: productTypeLabel(template.productType) })}</span>
                    {colors.length > 0 && (
                      <span className="flex items-center gap-1">
                        {colors.map((hex) => (
                          <GarmentColorSwatch key={hex} hex={hex} className="size-3" palette={template.printify?.colors} />
                        ))}
                      </span>
                    )}
                    {unused && <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{t("workflowConfig.mockupSelection.notUsed")}</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : isError ? null : (
        <PanelEmptyState icon={Shirt} title={t("workflowConfig.mockupSelection.emptyTitle")} description={t("workflowConfig.mockupSelection.emptyDescription")} className="py-5" />
      )}
      {isError && <PanelNotice tone="error">{t("workflowConfig.mockupSelection.loadError")}</PanelNotice>}
      {printifyProblem && <PanelNotice tone="warning">{printifyProblem}</PanelNotice>}
      {uncoveredTypes.length > 0 && (
        <PanelNotice tone="warning">
          {t("batchSetup.mockup.uncovered", {
            types: uncoveredTypes.map((type) => t(`batches.productTypes.${type}`, { defaultValue: productTypeLabel(type) })).join(", "),
          })}
        </PanelNotice>
      )}
      <Button type="button" variant="outline" size="sm" className="w-full hover:translate-y-0" disabled={isPending || isError} onClick={() => setOpen(true)}>
        {value.length === 0 ? <Plus aria-hidden="true" /> : <Pencil aria-hidden="true" />}
        {value.length === 0 ? t("workflowConfig.mockupSelection.chooseTemplates") : t("workflowConfig.mockupSelection.changeTemplates")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-5xl flex-col overflow-hidden sm:max-w-5xl">
          <DialogHeader className="text-left">
            <DialogTitle>{printify ? t("workflowConfig.mockupSelection.choosePrintifyTitle") : t("workflowConfig.mockupSelection.chooseMockupTitle")}</DialogTitle>
            <DialogDescription>
              {printify
                ? t("workflowConfig.mockupSelection.choosePrintifyDescription")
                : t("workflowConfig.mockupSelection.chooseMockupDescription")}
            </DialogDescription>
          </DialogHeader>
          {templates ? (
            <MockupTemplatePickerContent
              templates={templates}
              initialIds={value}
              initialTemplateColors={templateColors}
              initialTemplateBackgrounds={templateBackgrounds}
              initialTemplatePlacements={templatePlacements}
              pending={false}
              productTypeCounts={productTypeCounts && Object.keys(productTypeCounts).length > 0 ? productTypeCounts : undefined}
              sampleDesignUrl={sampleDesignUrl}
              onApply={apply}
              onClose={() => setOpen(false)}
              printifyOnly={printify}
            />
          ) : (
            <SectionLoading label={t("workflowConfig.mockupSelection.loadingTemplates")} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
