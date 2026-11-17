import { z } from "zod";

import { i18n } from "@/i18n/client";

export const mockupUploadSchema = z.object({ file: z.instanceof(File).refine(f => f.size > 0 && f.size <= 20 * 1024 * 1024, { error: () => i18n.t("workflowMedia.schema.imageMax20") }).refine(f => ["image/jpeg", "image/png", "image/webp"].includes(f.type), { error: () => i18n.t("workflowMedia.schema.imageType") }) });
export type MockupUploadFormValues = z.infer<typeof mockupUploadSchema>;
/** At most this many lifestyle images are made in one go, each one an Ideogram image (on the Seller's key, or the platform's when their plan includes it). */
export const MAX_LIFESTYLE_MOCKUPS = 8;
const lifestylePhoto = z.instanceof(File, { error: () => i18n.t("workflowMedia.schema.choosePhoto") }).refine(f => f.size > 0 && f.size <= 8 * 1024 * 1024, { error: () => i18n.t("workflowMedia.schema.photoMax8") }).refine(f => ["image/jpeg", "image/png", "image/webp"].includes(f.type), { error: () => i18n.t("workflowMedia.schema.imageType") });
/** The people to dress: an uploaded photo, whose rights the Seller confirms, or one of the model photos. */
export const lifestyleMockupSchema = z.object({ garmentMockupIds: z.array(z.string().uuid()).min(1, { error: () => i18n.t("workflowMedia.schema.chooseMockupToWear") }).max(MAX_LIFESTYLE_MOCKUPS, { error: () => i18n.t("workflowMedia.schema.mockupsMax", { max: MAX_LIFESTYLE_MOCKUPS }) }), source: z.enum(["upload", "library"]), file: lifestylePhoto.optional(), modelPhotoId: z.string().optional(), rightsConfirmed: z.boolean() }).superRefine((values, ctx) => {
  if (values.source === "library") {
    if (!values.modelPhotoId) ctx.addIssue({ code: "custom", path: ["modelPhotoId"], message: i18n.t("workflowMedia.schema.chooseModelPhoto") });
    return;
  }
  if (!values.file) ctx.addIssue({ code: "custom", path: ["file"], message: i18n.t("workflowMedia.schema.choosePhoto") });
  if (!values.rightsConfirmed) ctx.addIssue({ code: "custom", path: ["rightsConfirmed"], message: i18n.t("workflowMedia.schema.confirmRights") });
});
export type LifestyleMockupFormValues = z.infer<typeof lifestyleMockupSchema>;
