"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
  const designs = `${designCount} new design${designCount === 1 ? "" : "s"}`;

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
          <DialogTitle>Edit &amp; regenerate</DialogTitle>
          <DialogDescription>
            {product?.productName}: change what the design is made from, then generate it again. The
            current designs are kept.
          </DialogDescription>
        </DialogHeader>
        <form id="regenerate-product-form" onSubmit={submit} className="space-y-4">
          {/* Why the last designs did not come out, such as a possible brand or character: what to change. */}
          {product?.errorMessage && <PanelNotice tone="error">{product.errorMessage}</PanelNotice>}
          <div className="space-y-1.5">
            <FormTextareaField
              id="regenerate-custom-prompt"
              label="Image prompt"
              placeholder="Leave empty to use the design template"
              registration={register("customPrompt")}
              error={errors.customPrompt}
              rows={4}
            />
            <p className="text-muted-foreground text-xs">
              Replaces the design template and the art style for this product. Describe the image
              and its style; put any words to print in Design text.
            </p>
            {customPromptWarnings(values.customPrompt, values.designText, product?.productType).map(
              (warning) => (
                <p key={warning} className="text-xs text-amber-700">
                  {warning}
                </p>
              )
            )}
          </div>
          <div className="space-y-1.5">
            <FormInputField
              id="regenerate-design-text"
              label="Design text"
              type="text"
              placeholder={ownPrompt ? "Leave empty for no words" : "e.g. GO HIGHER"}
              registration={register("designText")}
              error={errors.designText}
              maxLength={100}
            />
            <p className="text-muted-foreground text-xs">
              The exact words printed on the design. With a lettering template, leaving it empty
              prints the product name; with an image prompt, it prints no words.
            </p>
          </div>
          <Accordion type="single" collapsible>
            <AccordionItem value="more-options">
              <AccordionTrigger>More options</AccordionTrigger>
              <AccordionContent className="space-y-4 px-0.5">
                {ownPrompt ? (
                  <p className="text-muted-foreground text-xs">
                    The design template and the art style are not used with an image prompt.
                  </p>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="regenerate-template">Design template</Label>
                      <DesignTemplateSelect
                        id="regenerate-template"
                        value={templateId}
                        placeholder="Choose design template"
                        onChange={setTemplateId}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="regenerate-art-style">Art style</Label>
                      <StylePresetSelect
                        id="regenerate-art-style"
                        value={stylePresetId}
                        placeholder="Choose art style"
                        noneLabel="No style"
                        onChange={setStylePresetId}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      First set to what the workflow uses now. A change here is kept for this
                      product only.
                    </p>
                  </>
                )}
                <div className="space-y-1.5">
                  <FormTextareaField
                    id="regenerate-instructions"
                    label="Extra instructions"
                    placeholder="e.g. warmer, nostalgic colors; add wildflowers around the lettering"
                    registration={register("instructions")}
                    error={errors.instructions}
                    rows={3}
                  />
                  <p className="text-muted-foreground text-xs">
                    What to add or change in this design: its feel, colors or details. Used for
                    this product in place of the workflow&apos;s extra instructions. Put words to
                    print in Design text.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className="space-y-1.5">
            <p id="regenerate-design-count" className="text-sm font-medium">
              Number of designs
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
              For this product only. The job and the workflow keep their own Variants per product.
            </p>
          </div>
          <PanelNotice tone="warning">
            Generating again makes {designs}. They count toward your plan&apos;s image quota and
            your image provider charges for them, like any generation.
          </PanelNotice>
        </form>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="regenerate-product-form" disabled={isPending}>
            {isPending ? "Starting…" : "Regenerate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
