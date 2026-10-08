"use client";

import { useForm } from "react-hook-form";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RegionEditor } from "@/components/workflows/media/region-editor";
import { useUpdateMockupAsset } from "@/hooks/mutations/use-update-mockup-asset";
import type { MockupMetadataFormValues } from "@/schemas/video-workflow";
import { mockupMetadataSchema } from "@/schemas/video-workflow";
import type { MockupAsset } from "@/types/video-workflow";
import { zodResolver } from "@hookform/resolvers/zod";

export const MockupMetadataForm = ({ asset, artworkGroups }: { asset: MockupAsset; artworkGroups: string[] }) => {
  const form = useForm<MockupMetadataFormValues>({
    resolver: zodResolver(mockupMetadataSchema),
    defaultValues: {
      role: mockupMetadataSchema.shape.role.parse(asset.role),
      artworkGroupKey: asset.artworkGroupKey ?? asset.productId,
      variantKey: asset.variantKey ?? "",
      regions: { ...asset.regions, focalPoint: asset.regions.focalPoint ?? { x: 0.5, y: 0.5 } },
    },
  });
  const { mutate: update, isPending } = useUpdateMockupAsset();

  return <Form {...form}><form className="space-y-3" onSubmit={form.handleSubmit(values => update({ ...values, id: asset.id, expectedRevision: asset.revision }))}>
    <FormField control={form.control} name="regions" render={({ field }) => <FormItem><FormControl><RegionEditor imageUrl={asset.previewUrl} width={asset.width} height={asset.height} value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>} />
    <Accordion type="single" collapsible>
      <AccordionItem value="advanced"><AccordionTrigger>Advanced information</AccordionTrigger><AccordionContent className="space-y-3">
        <FormField control={form.control} name="role" render={({ field }) => <FormItem><FormLabel>Image role</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{mockupMetadataSchema.shape.role.options.map(role => <SelectItem value={role} key={role}>{role}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
        {artworkGroups.length > 1 && <FormField control={form.control} name="artworkGroupKey" render={({ field }) => <FormItem><FormLabel>Artwork group</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{artworkGroups.map(group => <SelectItem value={group} key={group}>{group}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />}
        <FormField control={form.control} name="variantKey" render={({ field }) => <FormItem><FormLabel>Variant</FormLabel><FormControl><input className="border-input focus-visible:ring-ring h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-2" {...field} value={field.value ?? ""} placeholder="Optional, for example Blue" /></FormControl><FormMessage /></FormItem>} />
      </AccordionContent></AccordionItem>
    </Accordion>
    <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">Saving these changes removes the current approval. The updated image must be reviewed again.</p>
    <Button type="submit" size="sm" disabled={isPending || !form.formState.isDirty}>Save image settings</Button>
  </form></Form>;
};
