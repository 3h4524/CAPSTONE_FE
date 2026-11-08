import { z } from "zod";

export const mockupUploadSchema = z.object({ file: z.instanceof(File).refine(f => f.size > 0 && f.size <= 20 * 1024 * 1024, "Image must be at most 20 MB.").refine(f => ["image/jpeg", "image/png", "image/webp"].includes(f.type), "Choose JPEG, PNG or static WebP.") });
export type MockupUploadFormValues = z.infer<typeof mockupUploadSchema>;
