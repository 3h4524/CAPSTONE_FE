"use client";
import { useForm } from "react-hook-form";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showToast } from "@/helpers/toast";
import { useGenerateLifestyleMockup } from "@/hooks/mutations/use-generate-lifestyle-mockup";
import type { LifestyleMockupFormValues } from "@/schemas/video-workflow";
import { lifestyleMockupSchema } from "@/schemas/video-workflow";
import type { MockupAsset } from "@/types/video-workflow";
import { zodResolver } from "@hookform/resolvers/zod";

export const LifestyleMockupForm = ({ productId, assets }: { productId: string; assets: MockupAsset[] }) => {
  // A lifestyle image already shows a person; the product comes from one of the other mock-ups.
  const garments = assets.filter(asset => asset.role !== "Lifestyle");
  const preferred = garments.find(asset => asset.role === "Hero") ?? garments[0];
  const form = useForm<LifestyleMockupFormValues>({ resolver: zodResolver(lifestyleMockupSchema), values: { garmentMockupId: preferred?.id ?? "", file: undefined as unknown as File }, resetOptions: { keepDirtyValues: true } });
  const { mutate: generate, isPending } = useGenerateLifestyleMockup();
  if (garments.length === 0) return null;
  // Folded away by default: it is an extra, paid step most videos do without.
  return <Accordion type="single" collapsible className="rounded-lg border px-3">
    <AccordionItem value="lifestyle">
      <AccordionTrigger className="py-2.5 hover:no-underline">
        <span className="text-sm font-medium text-slate-900">AI lifestyle image</span>
      </AccordionTrigger>
      <AccordionContent>
        <Form {...form}><form className="space-y-3" aria-label="AI lifestyle image" onSubmit={form.handleSubmit(values => generate({ productId, ...values }, { onSuccess: () => { form.reset(); showToast("success", "Lifestyle image created. Review and approve it before the video."); } }))}>
          <p className="text-muted-foreground text-xs leading-relaxed">Upload a photo of an adult and AI dresses them in the product. The result is added as a Lifestyle image for Lifestyle motion videos.</p>
          <FormField control={form.control} name="file" render={({ field }) => <FormItem><FormLabel>Photo of an adult</FormLabel><FormControl><Input type="file" accept="image/jpeg,image/png,image/webp" disabled={isPending} className="text-muted-foreground file:bg-muted h-9 cursor-pointer bg-white py-1 text-xs file:mr-2 file:h-6.5 file:rounded file:px-2.5 file:text-xs file:text-slate-700" onChange={e => field.onChange(e.target.files?.[0])} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="garmentMockupId" render={({ field }) => <FormItem><FormLabel>Product mockup to wear</FormLabel><Select value={field.value} onValueChange={field.onChange} disabled={isPending}><FormControl><SelectTrigger className="w-full bg-white"><SelectValue placeholder="Choose a mockup" /></SelectTrigger></FormControl><SelectContent>{garments.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.role} · {asset.variantKey ?? asset.id.slice(0, 8)}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
          <p className="text-muted-foreground text-xs leading-relaxed">JPEG, PNG or static WebP · 8 MB. Use only photos you have the rights to. One image is charged to your Gemini key; AI can alter the print, so check the result.</p>
          <Button type="submit" size="sm" className="w-full hover:translate-y-0" disabled={isPending}>{isPending ? "Generating…" : "Generate lifestyle image"}</Button>
        </form></Form>
      </AccordionContent>
    </AccordionItem>
  </Accordion>;
};
