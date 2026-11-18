import { z } from "zod";

import { i18n } from "@/i18n/client";

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, { error: () => i18n.t("profile.schema.fullNameRequired") }).max(100, { error: () => i18n.t("auth.validation.fullNameTooLong") }),
  email: z.email({ error: () => i18n.t("auth.validation.emailInvalid") }).max(254, { error: () => i18n.t("profile.schema.emailTooLong") }),
  shopName: z.string().max(100, { error: () => i18n.t("profile.schema.shopNameTooLong") }),
  shopDescription: z.string().max(100, { error: () => i18n.t("profile.schema.shopDescriptionTooLong") }),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
