"use client";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUploadMockupAsset } from "@/hooks/mutations/use-upload-mockup-asset";
import type { MockupUploadFormValues } from "@/schemas/video-workflow";
import { mockupUploadSchema } from "@/schemas/video-workflow";
import { zodResolver } from "@hookform/resolvers/zod";

export const MockupUploadForm = ({ productId }: { productId: string }) => {
  const form = useForm<MockupUploadFormValues>({ resolver: zodResolver(mockupUploadSchema) });
  const { mutate: upload, isPending } = useUploadMockupAsset();
  return <Form {...form}><form className="space-y-3" onSubmit={form.handleSubmit(values => upload({ productId, file: values.file }, { onSuccess: () => form.reset() }))}>
    <FormField control={form.control} name="file" render={({ field }) => <FormItem><FormLabel>Upload mockup</FormLabel><FormControl><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => field.onChange(e.target.files?.[0])} /></FormControl><FormMessage /></FormItem>} />
    <p className="text-muted-foreground text-xs">JPEG, PNG or static WebP · 20 MB per image. Choose at most 8 for a run.</p>
    <Button type="submit" size="sm" disabled={isPending}>Upload</Button>
  </form></Form>;
};
