"use client";

import type { FormEventHandler } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type BatchFormValues, productTypes } from "@/schemas/batches";
import type { ProductType } from "@/types/batches";

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
  return (
      <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{isEditing ? t("batches.form.editTitle") : t("batches.form.createTitle")}</DialogTitle><DialogDescription>{isEditing ? t("batches.form.editDescription") : t("batches.form.createDescription")}</DialogDescription></DialogHeader><form onSubmit={onSubmit} className="space-y-4"><div className="space-y-2"><Label htmlFor="batch-name" className="leading-5">{t("batches.form.nameLabel")}</Label><Input id="batch-name" {...form.register("name")} placeholder={t("batches.form.namePlaceholder")} aria-invalid={!!form.formState.errors.name}/>{form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}</div><div className="space-y-2"><Label htmlFor="batch-niche" className="leading-5">{t("batches.form.defaultNicheLabel")}</Label><Input id="batch-niche" {...form.register("defaultNiche")} placeholder={t("batches.form.defaultNichePlaceholder")}/><p className="text-muted-foreground text-xs">{t("batches.form.defaultNicheHint")}</p></div><div className="space-y-2"><Label htmlFor="batch-product-type" className="leading-5">{t("batches.form.defaultProductTypeLabel")}</Label><Select value={form.watch("defaultProductType") || "none"} onValueChange={(value) => form.setValue("defaultProductType", value === "none" ? "" : value as ProductType)}><SelectTrigger id="batch-product-type" className="w-full"><SelectValue placeholder={t("batches.form.noDefault")}/></SelectTrigger><SelectContent><SelectItem value="none">{t("batches.form.noDefault")}</SelectItem>{productTypes.map((type) => <SelectItem key={type} value={type}>{t(`mockups.productTypes.${type}`)}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="batch-description" className="leading-5">{t("batches.form.descriptionLabel")}</Label><Textarea id="batch-description" {...form.register("description")} placeholder={t("batches.form.descriptionPlaceholder")}/></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("batches.cancel")}</Button><Button type="submit" disabled={isCreating || isSaving}>{isCreating ? t("batches.form.creating") : isSaving ? t("batches.saving") : isEditing ? t("batches.saveChanges") : t("batches.form.createBatch")}</Button></DialogFooter></form></DialogContent></Dialog>
  );
};
