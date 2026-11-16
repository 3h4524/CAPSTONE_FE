"use client";

import type { FormEventHandler } from "react";
import { type UseFormReturn, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { productLineOf, productLines, productLineTypes } from "@/constants/batches";
import { lineTypesText, productLineName, productTypeName } from "@/helpers/product-lines";
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

export const BatchFormDialog = ({ open, onOpenChange, form, isEditing, isCreating, isSaving, onSubmit }: BatchFormDialogProps) => {
  const { t } = useTranslation("common");
  // The line is the line of the batch's product type, so choosing a line picks its first type. useWatch, not
  // form.watch: the React Compiler keeps form.watch's first answer, since the form object itself never changes.
  const productType = useWatch({ control: form.control, name: "defaultProductType" });
  const line = productLineOf(productType);
  const typeError = form.formState.errors.defaultProductType?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? t("batches.form.editTitle") : t("batches.form.createTitle")}</DialogTitle>
          <DialogDescription>{isEditing ? t("batches.form.editDescription") : t("batches.form.createDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch-name" className="leading-5">{t("batches.form.nameLabel")}</Label>
            <Input id="batch-name" {...form.register("name")} placeholder={t("batches.form.namePlaceholder")} aria-invalid={!!form.formState.errors.name} />
            {form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch-product-line" className="leading-5">{t("batches.form.productLineLabel")}</Label>
            <Select
              value={line ?? ""}
              onValueChange={(value) => {
                const next = value as ProductLine;
                if (next !== line) form.setValue("defaultProductType", productLineTypes[next][0], { shouldDirty: true, shouldValidate: true });
              }}
            >
              <SelectTrigger id="batch-product-line" className="w-full" aria-invalid={!!typeError}>
                <SelectValue placeholder={t("batches.form.productLinePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {productLines.map((option) => (
                  <SelectItem key={option} value={option}>
                    {productLineName(option)}
                    <span className="text-muted-foreground text-xs">{lineTypesText(option, "conjunction")}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">{t("batches.form.productLineHint")}</p>
            {typeError && <p className="text-destructive text-sm">{typeError}</p>}
          </div>
          {line && productLineTypes[line].length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="batch-product-type" className="leading-5">{t("batches.form.defaultProductTypeLabel")}</Label>
              <Select value={productType} onValueChange={(value) => form.setValue("defaultProductType", value as ProductType, { shouldDirty: true, shouldValidate: true })}>
                <SelectTrigger id="batch-product-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {productLineTypes[line].map((type) => (
                    <SelectItem key={type} value={type}>{productTypeName(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">{t("batches.form.defaultProductTypeHint", { line: productLineName(line).toLocaleLowerCase() })}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="batch-niche" className="leading-5">{t("batches.form.defaultNicheLabel")}</Label>
            <Input id="batch-niche" {...form.register("defaultNiche")} placeholder={t("batches.form.defaultNichePlaceholder")} />
            <p className="text-muted-foreground text-xs">{t("batches.form.defaultNicheHint")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch-description" className="leading-5">{t("batches.form.descriptionLabel")}</Label>
            <Textarea id="batch-description" {...form.register("description")} placeholder={t("batches.form.descriptionPlaceholder")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("batches.cancel")}</Button>
            <Button type="submit" disabled={isCreating || isSaving}>
              {isCreating ? t("batches.form.creating") : isSaving ? t("batches.saving") : isEditing ? t("batches.saveChanges") : t("batches.form.createBatch")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
