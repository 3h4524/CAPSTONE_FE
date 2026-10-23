"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { FormTextareaField } from "@/components/commons/forms/form-textarea-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { customPromptWarnings } from "@/helpers/design-text";
import { useRegenerateBatchJobProduct } from "@/hooks/mutations/use-regenerate-batch-job-product";
import { productSchema } from "@/schemas/batches";
import type { BatchJobProductResult, RegenerateProductInput } from "@/types/batch-jobs";
import { zodResolver } from "@hookform/resolvers/zod";

// The same limits and messages as the product form, where these two fields are first entered.
const regenerateSchema = productSchema.pick({ customPrompt: true, designText: true });

type RegenerateProductDialogProps = {
  batchJobId: string;
  /** The product to generate again; the dialog is open while one is given. */
  product: BatchJobProductResult | null;
  /** How many designs each generation makes, from the job's settings. */
  variationCount: number;
  onOpenChange: (open: boolean) => void;
};

const toFormValues = (product: BatchJobProductResult | null): RegenerateProductInput => ({
  customPrompt: product?.customPrompt ?? "",
  designText: product?.designText ?? "",
});

// Changes what one product's design is made from and generates it again within its finished job. Its current designs
// are kept, so a result that is not better loses nothing.
export const RegenerateProductDialog = ({
  batchJobId,
  product,
  variationCount,
  onOpenChange,
}: RegenerateProductDialogProps) => {
  const { mutate: regenerate, isPending } = useRegenerateBatchJobProduct();
  const {
    register,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegenerateProductInput>({
    resolver: zodResolver(regenerateSchema),
    defaultValues: toFormValues(product),
  });

  useEffect(() => {
    if (product) reset(toFormValues(product));
  }, [product, reset]);

  const values = watch();
  const ownPrompt = values.customPrompt.trim().length > 0;
  const designs = `${variationCount} new design${variationCount === 1 ? "" : "s"}`;

  const submit = handleSubmit((input) => {
    if (!product) return;
    regenerate(
      {
        batchJobId,
        rowId: product.id,
        customPrompt: input.customPrompt.trim(),
        designText: input.designText.trim(),
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
              Replaces the design template and the art style set in the workflow for this product.
              Describe the image and its style; put any words to print in Design text.
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
