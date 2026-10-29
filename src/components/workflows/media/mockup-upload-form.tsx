"use client";
import { Upload } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUploadMockupAsset } from "@/hooks/mutations/use-upload-mockup-asset";
import type { MockupUploadFormValues } from "@/schemas/video-workflow";
import { mockupUploadSchema } from "@/schemas/video-workflow";
import { zodResolver } from "@hookform/resolvers/zod";

export const MockupUploadForm = ({ productId }: { productId: string }) => {
  const form = useForm<MockupUploadFormValues>({ resolver: zodResolver(mockupUploadSchema) });
  const { mutate: upload, isPending } = useUploadMockupAsset();
  return <Form {...form}><form onSubmit={form.handleSubmit(values => upload({ productId, file: values.file }, { onSuccess: () => form.reset() }))}>
    <FormField control={form.control} name="file" render={({ field }) => <FormItem>
      <FormLabel>Upload mockup</FormLabel>
      <FormControl><Input type="file" accept="image/jpeg,image/png,image/webp" className="text-muted-foreground file:bg-muted h-9 cursor-pointer bg-white py-1 text-xs file:mr-2 file:h-6.5 file:rounded file:px-2.5 file:text-xs file:text-slate-700" onChange={e => field.onChange(e.target.files?.[0])} /></FormControl>
      <FormMessage />
      <div className="flex items-start justify-between gap-3">
        <FormDescription className="text-xs leading-relaxed">JPEG, PNG or static WebP · 20 MB per image. Choose at most 8 for a run.</FormDescription>
        <Button type="submit" size="sm" variant="outline" className="h-8 shrink-0 px-3 hover:translate-y-0" disabled={isPending}><Upload aria-hidden="true" />Upload</Button>
      </div>
    </FormItem>} />
  </form></Form>;
};
