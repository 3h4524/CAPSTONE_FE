import { z } from "zod";

export const mockupUploadSchema = z.object({ file: z.instanceof(File).refine(f => f.size > 0 && f.size <= 20 * 1024 * 1024, "Image must be at most 20 MB.").refine(f => ["image/jpeg", "image/png", "image/webp"].includes(f.type), "Choose JPEG, PNG or static WebP.") });
export type MockupUploadFormValues = z.infer<typeof mockupUploadSchema>;
/** At most this many lifestyle images are made in one go, each one charged to the Seller's Ideogram key. */
export const MAX_LIFESTYLE_MOCKUPS = 8;
const lifestylePhoto = z.instanceof(File, { error: "Choose a photo of a model." }).refine(f => f.size > 0 && f.size <= 8 * 1024 * 1024, "Photo must be at most 8 MB.").refine(f => ["image/jpeg", "image/png", "image/webp"].includes(f.type), "Choose JPEG, PNG or static WebP.");
/** The people to dress: an uploaded photo, whose rights the Seller confirms, or one of the model photos. */
export const lifestyleMockupSchema = z.object({ garmentMockupIds: z.array(z.string().uuid()).min(1, "Choose at least one product mockup to wear.").max(MAX_LIFESTYLE_MOCKUPS, `Choose at most ${MAX_LIFESTYLE_MOCKUPS} mockups at a time.`), source: z.enum(["upload", "library"]), file: lifestylePhoto.optional(), modelPhotoId: z.string().optional(), rightsConfirmed: z.boolean() }).superRefine((values, ctx) => {
  if (values.source === "library") {
    if (!values.modelPhotoId) ctx.addIssue({ code: "custom", path: ["modelPhotoId"], message: "Choose a model photo." });
    return;
  }
  if (!values.file) ctx.addIssue({ code: "custom", path: ["file"], message: "Choose a photo of a model." });
  if (!values.rightsConfirmed) ctx.addIssue({ code: "custom", path: ["rightsConfirmed"], message: "Confirm you have the rights to this photo." });
});
export type LifestyleMockupFormValues = z.infer<typeof lifestyleMockupSchema>;
