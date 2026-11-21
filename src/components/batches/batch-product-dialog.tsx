"use client";

import { AlertCircle } from "lucide-react";
import type { FormEventHandler, ReactNode } from "react";
import { type UseFormReturn, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { productLineTypes } from "@/constants/batches";
import { customPromptWarnings } from "@/helpers/design-text";
import { lineTypesText, productLineName, productTypeName } from "@/helpers/product-lines";
import { type ProductFormValues, productTypes } from "@/schemas/batches";
import type { ProductLine, ProductType } from "@/types/batches";
import { cn } from "@/utils/cn";

type BatchProductDialogProps = {
  /** The batch's line: its products are of these types only. */
  productLine: ProductLine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<ProductFormValues>;
  isEditing: boolean;
  isSaving: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

// A field the form or the backend refused (a content-policy hit included) stands out in red, focused or not.
const invalidFieldClassName =
  "aria-invalid:border-destructive aria-invalid:bg-destructive/[0.03] aria-invalid:ring-[3px] aria-invalid:ring-destructive/15 aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/25";

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <p id={id} role="alert" className="text-destructive flex items-start gap-1.5 text-sm leading-snug">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  ) : null;

const FieldLabel = ({ htmlFor, invalid, children }: { htmlFor: string; invalid: boolean; children: ReactNode }) => (
  <Label htmlFor={htmlFor} className={cn("leading-5", invalid && "text-destructive")}>
    {children}
  </Label>
);

export const BatchProductDialog = ({ productLine, open, onOpenChange, form, isEditing, isSaving, onSubmit }: BatchProductDialogProps) => {
  const { t } = useTranslation("common");
  const typeOptions = productLine ? productLineTypes[productLine] : productTypes;
  // useWatch, not form.watch: the React Compiler keeps form.watch's first answer, since the form object never changes.
  const productType = useWatch({ control: form.control, name: "productType" });
  const designText = useWatch({ control: form.control, name: "designText" });
  const customPrompt = useWatch({ control: form.control, name: "customPrompt" });
  // A line of one type sets it: the product comes in the batch's type, with nothing to choose.
  const fixedType = productLine && typeOptions.length === 1 ? typeOptions[0] : null;
  const { errors } = form.formState;
  const errorId = (field: string) => `product-${field}-error`;
  const invalidProps = (field: keyof ProductFormValues) =>
    errors[field] ? { "aria-invalid": true as const, "aria-describedby": errorId(field) } : { "aria-invalid": false as const };
  const optional = <span className="text-muted-foreground font-normal">{t("batches.product.optional")}</span>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("batches.product.editTitle") : t("batches.addProduct")}</DialogTitle>
          <DialogDescription>{t("batches.product.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <FieldLabel htmlFor="product-name" invalid={!!errors.name}>{t("batches.product.nameLabel")}</FieldLabel>
            <Input id="product-name" {...form.register("name")} {...invalidProps("name")} className={invalidFieldClassName} />
            <FieldError id={errorId("name")} message={errors.name?.message} />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="product-type" invalid={!!errors.productType}>{t("batches.product.typeLabel")}</FieldLabel>
            {fixedType ? (
              <Input id="product-type" value={productTypeName(fixedType)} readOnly disabled />
            ) : (
              <Select
                value={productType}
                onValueChange={(value) => {
                  if (value) form.setValue("productType", value as ProductType, { shouldValidate: true });
                }}
              >
                <SelectTrigger id="product-type" className={cn("w-full", invalidFieldClassName)} {...invalidProps("productType")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((type) => (
                    <SelectItem key={type} value={type}>{productTypeName(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {productLine && (
              <p className="text-muted-foreground text-xs">
                {fixedType
                  ? t("batches.product.lineFixedHint", { line: productLineName(productLine).toLocaleLowerCase(), type: productTypeName(fixedType) })
                  : t("batches.product.lineTypesHint", { line: productLineName(productLine).toLocaleLowerCase(), types: lineTypesText(productLine, "conjunction") })}
              </p>
            )}
            <FieldError id={errorId("productType")} message={errors.productType?.message} />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="product-niche" invalid={!!errors.niche}>{t("batches.product.nicheLabel")}</FieldLabel>
            <Input id="product-niche" {...form.register("niche")} placeholder={t("batches.product.nichePlaceholder")} {...invalidProps("niche")} className={invalidFieldClassName} />
            <p className="text-muted-foreground text-xs">{t("batches.product.nicheHint")}</p>
            <FieldError id={errorId("niche")} message={errors.niche?.message} />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="product-keywords" invalid={!!errors.keywords}>
              {t("batches.product.keywordsLabel")} <span className="text-muted-foreground font-normal">{t("batches.product.keywordsHint")}</span>
            </FieldLabel>
            <Input id="product-keywords" {...form.register("keywords")} placeholder={t("batches.product.keywordsPlaceholder")} {...invalidProps("keywords")} className={invalidFieldClassName} />
            <FieldError id={errorId("keywords")} message={errors.keywords?.message} />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="product-design-text" invalid={!!errors.designText}>{t("batches.product.designTextLabel")} {optional}</FieldLabel>
            <Input id="product-design-text" maxLength={100} {...form.register("designText")} placeholder={t("batches.product.designTextPlaceholder")} {...invalidProps("designText")} className={invalidFieldClassName} />
            <p className="text-muted-foreground text-xs">{t("batches.product.designTextHint")}</p>
            <FieldError id={errorId("designText")} message={errors.designText?.message} />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="product-custom-prompt" invalid={!!errors.customPrompt}>{t("batches.product.imagePromptLabel")} {optional}</FieldLabel>
            <Textarea id="product-custom-prompt" maxLength={1000} {...form.register("customPrompt")} placeholder={t("batches.product.imagePromptPlaceholder")} {...invalidProps("customPrompt")} className={invalidFieldClassName} />
            <p className="text-muted-foreground text-xs">{t("batches.product.imagePromptHint")}</p>
            {customPromptWarnings(customPrompt, designText, productType).map((warning) => (
              <p key={warning} className="text-xs text-amber-700 dark:text-amber-300">{warning}</p>
            ))}
            <FieldError id={errorId("customPrompt")} message={errors.customPrompt?.message} />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="product-description" invalid={!!errors.productDescription}>{t("batches.product.productDescriptionLabel")} {optional}</FieldLabel>
            <Textarea id="product-description" maxLength={2000} {...form.register("productDescription")} placeholder={t("batches.product.productDescriptionPlaceholder")} {...invalidProps("productDescription")} className={invalidFieldClassName} />
            <p className="text-muted-foreground text-xs">{t("batches.product.productDescriptionHint")}</p>
            <FieldError id={errorId("productDescription")} message={errors.productDescription?.message} />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="product-notes" invalid={!!errors.sourceNotes}>{t("batches.product.sourceNotesLabel")} {optional}</FieldLabel>
            <Textarea id="product-notes" {...form.register("sourceNotes")} placeholder={t("batches.product.sourceNotesPlaceholder")} {...invalidProps("sourceNotes")} className={invalidFieldClassName} />
            <FieldError id={errorId("sourceNotes")} message={errors.sourceNotes?.message} />
          </div>

          {/* A refusal that names no field (the batch was removed, the server is down, ...). */}
          {errors.root?.server?.message && (
            <div role="alert" className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{errors.root.server.message}</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("batches.cancel")}</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t("batches.saving") : isEditing ? t("batches.saveChanges") : t("batches.addProduct")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
