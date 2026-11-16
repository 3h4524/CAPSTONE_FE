"use client";

import type { FormEventHandler } from "react";
import { type UseFormReturn, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { productLineLabels, productLineTypes, productTypeLabels } from "@/constants/batches";
import { customPromptWarnings } from "@/helpers/design-text";
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
  const typeOptions = productLine ? productLineTypes[productLine] : productTypes;
  // useWatch, not form.watch: the React Compiler keeps form.watch's first answer, since the form object never changes.
  const productType = useWatch({ control: form.control, name: "productType" });
  const designText = useWatch({ control: form.control, name: "designText" });
  const customPrompt = useWatch({ control: form.control, name: "customPrompt" });
  // A line of one type sets it: the product comes in the batch's type, with nothing to choose.
  const fixedType = productLine && typeOptions.length === 1 ? typeOptions[0] : null;
  return (
      <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{isEditing ? "Edit product" : "Add product"}</DialogTitle><DialogDescription>These are the product inputs currently stored for the creation queue.</DialogDescription></DialogHeader><form onSubmit={onSubmit} className="space-y-5"><div className="space-y-2"><Label htmlFor="product-name" className="leading-5">Product name *</Label><Input id="product-name" {...form.register("name")} aria-invalid={!!form.formState.errors.name}/>{form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-type" className="leading-5">Product type *</Label>{fixedType ? <Input id="product-type" value={productTypeLabels[fixedType]} readOnly disabled /> : <Select value={productType} onValueChange={(value) => { if (value) form.setValue("productType", value as ProductType, { shouldValidate: true }); }}><SelectTrigger id="product-type" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{typeOptions.map((type) => <SelectItem key={type} value={type}>{productTypeLabels[type]}</SelectItem>)}</SelectContent></Select>}{productLine && <p className="text-muted-foreground text-xs">{fixedType ? `Set by the batch: a ${productLineLabels[productLine].toLowerCase()} batch makes ${productTypeLabels[fixedType]} products only.` : `A ${productLineLabels[productLine].toLowerCase()} batch makes ${typeOptions.map((type) => productTypeLabels[type]).join(" and ")} products only.`}</p>}</div><div className="space-y-2"><Label htmlFor="product-niche" className="leading-5">Niche *</Label><Input id="product-niche" {...form.register("niche")} placeholder="e.g. hiking enthusiasts" aria-invalid={!!form.formState.errors.niche}/><p className="text-muted-foreground text-xs">The specific audience or interest this product is for.</p>{form.formState.errors.niche && <p className="text-destructive text-sm">{form.formState.errors.niche.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-keywords" className="leading-5">Keywords * <span className="text-muted-foreground font-normal">(comma separated, up to 13)</span></Label><Input id="product-keywords" {...form.register("keywords")} placeholder="minimalist, nature, gift" aria-invalid={!!form.formState.errors.keywords}/>{form.formState.errors.keywords && <p className="text-destructive text-sm">{form.formState.errors.keywords.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-design-text" className="leading-5">Design text <span className="text-muted-foreground font-normal">(optional)</span></Label><Input id="product-design-text" maxLength={100} {...form.register("designText")} placeholder="e.g. GO HIGHER" aria-invalid={!!form.formState.errors.designText}/><p className="text-muted-foreground text-xs">The exact words printed on the design. With a lettering template, leaving it empty prints the product name; with an image prompt, it prints no words.</p>{form.formState.errors.designText && <p className="text-destructive text-sm">{form.formState.errors.designText.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-custom-prompt" className="leading-5">Image prompt <span className="text-muted-foreground font-normal">(optional)</span></Label><Textarea id="product-custom-prompt" maxLength={1000} {...form.register("customPrompt")} placeholder="e.g. A detailed vintage badge with a leaping trout, crossed fishing rods and a calm lake at sunrise" aria-invalid={!!form.formState.errors.customPrompt}/><p className="text-muted-foreground text-xs">Replaces the design template and the art style set in the workflow for this product. Describe the image and its style; put any words to print in Design text.</p>{customPromptWarnings(customPrompt, designText, productType).map((warning) => <p key={warning} className="text-xs text-amber-700 dark:text-amber-300">{warning}</p>)}{form.formState.errors.customPrompt && <p className="text-destructive text-sm">{form.formState.errors.customPrompt.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-description" className="leading-5">Product description <span className="text-muted-foreground font-normal">(optional)</span></Label><Textarea id="product-description" maxLength={2000} {...form.register("productDescription")} placeholder="Describe the product idea or design brief" aria-invalid={!!form.formState.errors.productDescription}/><p className="text-muted-foreground text-xs">Add the design idea or brief you want the generation workflow to use.</p>{form.formState.errors.productDescription && <p className="text-destructive text-sm">{form.formState.errors.productDescription.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-notes" className="leading-5">Source notes <span className="text-muted-foreground font-normal">(optional)</span></Label><Textarea id="product-notes" {...form.register("sourceNotes")} placeholder="Reference or production notes"/>{form.formState.errors.sourceNotes && <p className="text-destructive text-sm">{form.formState.errors.sourceNotes.message}</p>}</div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : isEditing ? "Save changes" : "Add product"}</Button></DialogFooter></form></DialogContent></Dialog>
  );
};
