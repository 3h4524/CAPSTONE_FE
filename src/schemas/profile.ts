import { z } from "zod";

import { LANGUAGE_VALUES, THEME_VALUES, TIMEZONES } from "@/constants/profile";

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Full name is too long"),
  email: z.email("Please enter a valid email address").max(254, "Email is too long"),
  shopName: z.string().max(100, "Shop name is too long"),
  shopDescription: z.string().max(100, "Shop description is too long"),
  timezone: z.enum(TIMEZONES, "Timezone is not supported"),
  language: z.enum(LANGUAGE_VALUES, "Language is not supported"),
  themePreference: z.enum(THEME_VALUES, "Theme preference is not supported"),
  notificationEmailEnabled: z.boolean(),
  newsletterSubscribed: z.boolean(),
  twoFactorEnabled: z.boolean(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
