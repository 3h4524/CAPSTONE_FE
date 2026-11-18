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
import { productLineTypes } from "@/constants/batches";
import { customPromptWarnings } from "@/helpers/design-text";
import { lineTypesText, productLineName, productTypeName } from "@/helpers/product-lines";
import { type ProductFormValues, productTypes } from "@/schemas/batches";
import type { ProductLine, ProductType } from "@/types/batches";

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

export const BatchProductDialog = ({ productLine, open, onOpenChange, form, isEditing, isSaving, onSubmit }: BatchProductDialogProps) => {
  const { t } = useTranslation("common");
  const typeOptions = productLine ? productLineTypes[productLine] : productTypes;
  // useWatch, not form.watch: the React Compiler keeps form.watch's first answer, since the form object never changes.
  const productType = useWatch({ control: form.control, name: "productType" });
  const designText = useWatch({ control: form.control, name: "designText" });
  const customPrompt = useWatch({ control: form.control, name: "customPrompt" });
  // A line of one type sets it: the product comes in the batch's type, with nothing to choose.
  const fixedType = productLine && typeOptions.length === 1 ? typeOptions[0] : null;
  return (
      <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{isEditing ? t("batches.product.editTitle") : t("batches.addProduct")}</DialogTitle><DialogDescription>{t("batches.product.description")}</DialogDescription></DialogHeader><form onSubmit={onSubmit} className="space-y-5"><div className="space-y-2"><Label htmlFor="product-name" className="leading-5">{t("batches.product.nameLabel")}</Label><Input id="product-name" {...form.register("name")} aria-invalid={!!form.formState.errors.name}/>{form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-type" className="leading-5">{t("batches.product.typeLabel")}</Label>{fixedType ? <Input id="product-type" value={productTypeName(fixedType)} readOnly disabled /> : <Select value={productType} onValueChange={(value) => { if (value) form.setValue("productType", value as ProductType, { shouldValidate: true }); }}><SelectTrigger id="product-type" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{typeOptions.map((type) => <SelectItem key={type} value={type}>{productTypeName(type)}</SelectItem>)}</SelectContent></Select>}{productLine && <p className="text-muted-foreground text-xs">{fixedType ? t("batches.product.lineFixedHint", { line: productLineName(productLine).toLocaleLowerCase(), type: productTypeName(fixedType) }) : t("batches.product.lineTypesHint", { line: productLineName(productLine).toLocaleLowerCase(), types: lineTypesText(productLine, "conjunction") })}</p>}</div><div className="space-y-2"><Label htmlFor="product-niche" className="leading-5">{t("batches.product.nicheLabel")}</Label><Input id="product-niche" {...form.register("niche")} placeholder={t("batches.product.nichePlaceholder")} aria-invalid={!!form.formState.errors.niche}/><p className="text-muted-foreground text-xs">{t("batches.product.nicheHint")}</p>{form.formState.errors.niche && <p className="text-destructive text-sm">{form.formState.errors.niche.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-keywords" className="leading-5">{t("batches.product.keywordsLabel")} <span className="text-muted-foreground font-normal">{t("batches.product.keywordsHint")}</span></Label><Input id="product-keywords" {...form.register("keywords")} placeholder={t("batches.product.keywordsPlaceholder")} aria-invalid={!!form.formState.errors.keywords}/>{form.formState.errors.keywords && <p className="text-destructive text-sm">{form.formState.errors.keywords.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-design-text" className="leading-5">{t("batches.product.designTextLabel")} <span className="text-muted-foreground font-normal">{t("batches.product.optional")}</span></Label><Input id="product-design-text" maxLength={100} {...form.register("designText")} placeholder={t("batches.product.designTextPlaceholder")} aria-invalid={!!form.formState.errors.designText}/><p className="text-muted-foreground text-xs">{t("batches.product.designTextHint")}</p>{form.formState.errors.designText && <p className="text-destructive text-sm">{form.formState.errors.designText.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-custom-prompt" className="leading-5">{t("batches.product.imagePromptLabel")} <span className="text-muted-foreground font-normal">{t("batches.product.optional")}</span></Label><Textarea id="product-custom-prompt" maxLength={1000} {...form.register("customPrompt")} placeholder={t("batches.product.imagePromptPlaceholder")} aria-invalid={!!form.formState.errors.customPrompt}/><p className="text-muted-foreground text-xs">{t("batches.product.imagePromptHint")}</p>{customPromptWarnings(customPrompt, designText, productType).map((warning) => <p key={warning} className="text-xs text-amber-700 dark:text-amber-300">{warning}</p>)}{form.formState.errors.customPrompt && <p className="text-destructive text-sm">{form.formState.errors.customPrompt.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-description" className="leading-5">{t("batches.product.productDescriptionLabel")} <span className="text-muted-foreground font-normal">{t("batches.product.optional")}</span></Label><Textarea id="product-description" maxLength={2000} {...form.register("productDescription")} placeholder={t("batches.product.productDescriptionPlaceholder")} aria-invalid={!!form.formState.errors.productDescription}/><p className="text-muted-foreground text-xs">{t("batches.product.productDescriptionHint")}</p>{form.formState.errors.productDescription && <p className="text-destructive text-sm">{form.formState.errors.productDescription.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-notes" className="leading-5">{t("batches.product.sourceNotesLabel")} <span className="text-muted-foreground font-normal">{t("batches.product.optional")}</span></Label><Textarea id="product-notes" {...form.register("sourceNotes")} placeholder={t("batches.product.sourceNotesPlaceholder")}/>{form.formState.errors.sourceNotes && <p className="text-destructive text-sm">{form.formState.errors.sourceNotes.message}</p>}</div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("batches.cancel")}</Button><Button type="submit" disabled={isSaving}>{isSaving ? t("batches.saving") : isEditing ? t("batches.saveChanges") : t("batches.addProduct")}</Button></DialogFooter></form></DialogContent></Dialog>
  );
};
