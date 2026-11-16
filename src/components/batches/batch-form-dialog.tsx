"use client";

import type { FormEventHandler } from "react";
import { type UseFormReturn, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { productLineLabels, productLineOf, productLines, productLineTypes, productTypeLabels } from "@/constants/batches";
import type { BatchFormValues } from "@/schemas/batches";
import type { ProductLine, ProductType } from "@/types/batches";

type BatchFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<BatchFormValues>;
  isEditing: boolean;
  isCreating: boolean;
  isSaving: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

const lineTypesText = (line: ProductLine) => productLineTypes[line].map((type) => productTypeLabels[type]).join(", ");

export const BatchFormDialog = ({ open, onOpenChange, form, isEditing, isCreating, isSaving, onSubmit }: BatchFormDialogProps) => {
  // The line is the line of the batch's product type, so choosing a line picks its first type. useWatch, not
  // form.watch: the React Compiler keeps form.watch's first answer, since the form object itself never changes.
  const productType = useWatch({ control: form.control, name: "defaultProductType" });
  const line = productLineOf(productType);
  const typeError = form.formState.errors.defaultProductType?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit product batch" : "Create product batch"}</DialogTitle>
          <DialogDescription>{isEditing ? "Update the batch name and defaults used for new products." : "Choose what the batch makes and set shared defaults to speed up adding products."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch-name" className="leading-5">Batch name *</Label>
            <Input id="batch-name" {...form.register("name")} placeholder="e.g. Summer outdoor collection" aria-invalid={!!form.formState.errors.name} />
            {form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch-product-line" className="leading-5">Product line *</Label>
            <Select
              value={line ?? ""}
              onValueChange={(value) => {
                const next = value as ProductLine;
                if (next !== line) form.setValue("defaultProductType", productLineTypes[next][0], { shouldDirty: true, shouldValidate: true });
              }}
            >
              <SelectTrigger id="batch-product-line" className="w-full" aria-invalid={!!typeError}>
                <SelectValue placeholder="Choose what the batch makes" />
              </SelectTrigger>
              <SelectContent>
                {productLines.map((option) => (
                  <SelectItem key={option} value={option}>
                    {productLineLabels[option]}
                    <span className="text-muted-foreground text-xs">{lineTypesText(option)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Every product in the batch is of this line, so its designs, mock-ups, videos and Printify products are made the same way. Put other products in a batch of their own.
            </p>
            {typeError && <p className="text-destructive text-sm">{typeError}</p>}
          </div>
          {line && productLineTypes[line].length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="batch-product-type" className="leading-5">Default product type</Label>
              <Select value={productType} onValueChange={(value) => form.setValue("defaultProductType", value as ProductType, { shouldDirty: true, shouldValidate: true })}>
                <SelectTrigger id="batch-product-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {productLineTypes[line].map((type) => (
                    <SelectItem key={type} value={type}>{productTypeLabels[type]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">Prefills new products; each can be any {productLineLabels[line].toLowerCase()} type.</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="batch-niche" className="leading-5">Default niche</Label>
            <Input id="batch-niche" {...form.register("defaultNiche")} placeholder="e.g. hiking and camping" />
            <p className="text-muted-foreground text-xs">Used to prefill new products; each product can override it.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch-description" className="leading-5">Description</Label>
            <Textarea id="batch-description" {...form.register("description")} placeholder="What is this batch for?" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isCreating || isSaving}>{isCreating ? "Creating…" : isSaving ? "Saving…" : isEditing ? "Save changes" : "Create batch"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
