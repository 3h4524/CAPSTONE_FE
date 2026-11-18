"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { FormTextareaField } from "@/components/commons/forms/form-textarea-field";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DesignTemplateSelect } from "@/components/workflows/config-panel/fields/design-template-select";
import { StylePresetSelect } from "@/components/workflows/config-panel/fields/style-preset-select";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { customPromptWarnings } from "@/helpers/design-text";
import { useRegenerateBatchJobProduct } from "@/hooks/mutations/use-regenerate-batch-job-product";
import { productSchema } from "@/schemas/batches";
import type { BatchJobProductResult } from "@/types/batch-jobs";
import { cn } from "@/utils/cn";
import { zodResolver } from "@hookform/resolvers/zod";

// The same limits and messages as the product form and the prompt editor, where these fields are first entered.
const regenerateSchema = productSchema.pick({ customPrompt: true, designText: true }).extend({
  instructions: z.string().max(1000, "Keep the instructions under 1,000 characters."),
});

type RegenerateFormValues = z.infer<typeof regenerateSchema>;

// The same range as Variants per product in the Design image settings.
const DESIGN_COUNTS = [1, 2, 3, 4];

/** What the workflow is set to now, which a product generated again starts from. */
export type RegenerateDefaults = {
  variationCount: number;
  designTemplateId: string;
  /** Empty for no art style. */
  stylePresetId: string;
  instructions: string;
};

type RegenerateProductDialogProps = {
  batchJobId: string;
  /** The product to generate again; the dialog is open while one is given. */
  product: BatchJobProductResult | null;
  defaults: RegenerateDefaults;
  onOpenChange: (open: boolean) => void;
};

const toFormValues = (product: BatchJobProductResult | null, defaults: RegenerateDefaults): RegenerateFormValues => ({
  customPrompt: product?.customPrompt ?? "",
  designText: product?.designText ?? "",
  // Instructions set for this product win over the workflow's.
  instructions: product?.instructions ?? defaults.instructions,
});

// Changes what one product's design is made from and generates it again within its finished job. Its current designs
// are kept, so a result that is not better loses nothing.
export const RegenerateProductDialog = ({
  batchJobId,
  product,
  defaults,
  onOpenChange,
}: RegenerateProductDialogProps) => {
  const { t } = useTranslation("common");
  const { mutate: regenerate, isPending } = useRegenerateBatchJobProduct();
  const {
    register,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegenerateFormValues>({
    resolver: zodResolver(regenerateSchema),
    defaultValues: toFormValues(product, defaults),
  });

  const [designCount, setDesignCount] = useState(defaults.variationCount);
  const [templateId, setTemplateId] = useState("");
  const [stylePresetId, setStylePresetId] = useState("");

  // Filled again each time a product is opened, from that product and the workflow as it is now.
  useEffect(() => {
    if (!product) return;
    reset(toFormValues(product, defaults));
    setDesignCount(defaults.variationCount);
    setTemplateId(defaults.designTemplateId || product.designTemplateId || "");
    setStylePresetId(defaults.stylePresetId);
    // Only opening another product refills the form: the workflow's values are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, reset]);

  const values = watch();
  const ownPrompt = values.customPrompt.trim().length > 0;
  const designs = t("batchJobs.regenerate.newDesigns", { count: designCount });

  const submit = handleSubmit((input) => {
    if (!product) return;
    regenerate(
      {
        batchJobId,
        rowId: product.id,
        customPrompt: input.customPrompt.trim(),
        designText: input.designText.trim(),
        variationCount: designCount,
        instructions: input.instructions.trim(),
        // A product's own image prompt replaces the template and the art style, so they are left as they are.
        ...(ownPrompt
          ? {}
          : { designTemplateId: templateId || undefined, styleArtPresetId: stylePresetId }),
      },
      { onSuccess: () => onOpenChange(false) }
    );
  });

  return (
    <Dialog open={product !== null} onOpenChange={(open) => !isPending && onOpenChange(open)}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle>{t("batchJobs.images.editRegenerate")}</DialogTitle>
          <DialogDescription>
            {t("batchJobs.regenerate.description", { name: product?.productName ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <form id="regenerate-product-form" onSubmit={submit} className="space-y-4">
          {/* Why the last designs did not come out, such as a possible brand or character: what to change. */}
          {product?.errorMessage && <PanelNotice tone="error">{product.errorMessage}</PanelNotice>}
          <div className="space-y-1.5">
            <FormTextareaField
              id="regenerate-custom-prompt"
              label={t("batchJobs.regenerate.imagePrompt")}
              placeholder={t("batchJobs.regenerate.imagePromptPlaceholder")}
              registration={register("customPrompt")}
              error={errors.customPrompt}
              rows={4}
            />
            <p className="text-muted-foreground text-xs">
              {t("batchJobs.regenerate.imagePromptHint")}
            </p>
            {customPromptWarnings(values.customPrompt, values.designText, product?.productType).map(
              (warning) => (
                <p key={warning} className="text-xs text-amber-700 dark:text-amber-300">
                  {warning}
                </p>
              )
            )}
          </div>
          <div className="space-y-1.5">
            <FormInputField
              id="regenerate-design-text"
              label={t("batchJobs.regenerate.designText")}
              type="text"
              placeholder={ownPrompt ? t("batchJobs.regenerate.noWords") : t("batchJobs.regenerate.designTextExample")}
              registration={register("designText")}
              error={errors.designText}
              maxLength={100}
            />
            <p className="text-muted-foreground text-xs">
              {t("batchJobs.regenerate.designTextHint")}
            </p>
          </div>
          <Accordion type="single" collapsible>
            <AccordionItem value="more-options">
              <AccordionTrigger>{t("batchJobs.regenerate.moreOptions")}</AccordionTrigger>
              <AccordionContent className="space-y-4 px-0.5">
                {ownPrompt ? (
                  <p className="text-muted-foreground text-xs">
                    {t("batchJobs.regenerate.notUsedWithPrompt")}
                  </p>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="regenerate-template">{t("batchJobs.regenerate.designTemplate")}</Label>
                      <DesignTemplateSelect
                        id="regenerate-template"
                        value={templateId}
                        placeholder={t("batchJobs.regenerate.chooseTemplate")}
                        onChange={setTemplateId}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="regenerate-art-style">{t("batchJobs.regenerate.artStyle")}</Label>
                      <StylePresetSelect
                        id="regenerate-art-style"
                        value={stylePresetId}
                        placeholder={t("batchJobs.regenerate.chooseArtStyle")}
                        noneLabel={t("batchJobs.regenerate.noStyle")}
                        onChange={setStylePresetId}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {t("batchJobs.regenerate.templateHint")}
                    </p>
                  </>
                )}
                <div className="space-y-1.5">
                  <FormTextareaField
                    id="regenerate-instructions"
                    label={t("batchJobs.regenerate.instructions")}
                    placeholder="e.g. warmer, nostalgic colors; add wildflowers around the lettering"
                    registration={register("instructions")}
                    error={errors.instructions}
                    rows={3}
                  />
                  <p className="text-muted-foreground text-xs">
                    {t("batchJobs.regenerate.instructionsHint")}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className="space-y-1.5">
            <p id="regenerate-design-count" className="text-sm font-medium">
              {t("batchJobs.regenerate.designCount")}
            </p>
            <div role="group" aria-labelledby="regenerate-design-count" className="flex gap-2">
              {DESIGN_COUNTS.map((count) => (
                <Button
                  key={count}
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-pressed={designCount === count}
                  onClick={() => setDesignCount(count)}
                  disabled={isPending}
                  className={cn(
                    "w-10",
                    designCount === count && "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                  )}
                >
                  {count}
                </Button>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("batchJobs.regenerate.designCountHint")}
            </p>
          </div>
          <PanelNotice tone="warning">
            {t("batchJobs.regenerate.costWarning", { designs })}
          </PanelNotice>
        </form>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("batchJobs.regenerate.cancel")}
          </Button>
          <Button type="submit" form="regenerate-product-form" disabled={isPending}>
            {isPending ? t("batchJobs.regenerate.starting") : t("batchJobs.regenerate.regenerate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
