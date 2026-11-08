"use client";

import type { FormEventHandler } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { productTypeLabels } from "@/constants/batches";
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

export const BatchFormDialog = ({ open, onOpenChange, form, isEditing, isCreating, isSaving, onSubmit }: BatchFormDialogProps) => (
      <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{isEditing ? "Edit product batch" : "Create product batch"}</DialogTitle><DialogDescription>{isEditing ? "Update the batch name and defaults used for new products." : "Set shared defaults to speed up adding products."}</DialogDescription></DialogHeader><form onSubmit={onSubmit} className="space-y-4"><div className="space-y-2"><Label htmlFor="batch-name" className="leading-5">Batch name *</Label><Input id="batch-name" {...form.register("name")} placeholder="e.g. Summer outdoor collection" aria-invalid={!!form.formState.errors.name}/>{form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}</div><div className="space-y-2"><Label htmlFor="batch-niche" className="leading-5">Default niche</Label><Input id="batch-niche" {...form.register("defaultNiche")} placeholder="e.g. hiking and camping"/><p className="text-muted-foreground text-xs">Used to prefill new products; each product can override it.</p></div><div className="space-y-2"><Label htmlFor="batch-product-type" className="leading-5">Default product type</Label><Select value={form.watch("defaultProductType") || "none"} onValueChange={(value) => form.setValue("defaultProductType", value === "none" ? "" : value as ProductType)}><SelectTrigger id="batch-product-type" className="w-full"><SelectValue placeholder="No default"/></SelectTrigger><SelectContent><SelectItem value="none">No default</SelectItem>{productTypes.map((type) => <SelectItem key={type} value={type}>{productTypeLabels[type]}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="batch-description" className="leading-5">Description</Label><Textarea id="batch-description" {...form.register("description")} placeholder="What is this batch for?"/></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={isCreating || isSaving}>{isCreating ? "Creating…" : isSaving ? "Saving…" : isEditing ? "Save changes" : "Create batch"}</Button></DialogFooter></form></DialogContent></Dialog>
);
