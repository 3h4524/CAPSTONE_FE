import { z } from "zod";

const normalized = z.number().min(0).max(1);
const region = z.object({ x: normalized, y: normalized, width: z.number().positive().max(1), height: z.number().positive().max(1) }).refine(r => r.x + r.width <= 1 && r.y + r.height <= 1, "Region must stay inside the image.");
export const mockupMetadataSchema = z.object({ role: z.enum(["Hero", "ArtworkDetail", "AlternativeAngle", "Lifestyle", "Variant"]), artworkGroupKey: z.string().trim().min(1).max(100), variantKey: z.string().max(100).nullable(), regions: z.object({ focalPoint: z.object({ x: normalized, y: normalized }).nullable(), product: region.nullable(), artwork: region.nullable(), detail: region.nullable() }) });
export type MockupMetadataFormValues = z.infer<typeof mockupMetadataSchema>;
export const mockupUploadSchema = z.object({ file: z.instanceof(File).refine(f => f.size > 0 && f.size <= 20 * 1024 * 1024, "Image must be at most 20 MB.").refine(f => ["image/jpeg", "image/png", "image/webp"].includes(f.type), "Choose JPEG, PNG or static WebP.") });
export type MockupUploadFormValues = z.infer<typeof mockupUploadSchema>;
