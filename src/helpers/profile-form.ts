import { DEFAULT_THEME } from "@/constants/profile";
import type { ProfileFormValues } from "@/schemas/profile";
import type { Profile } from "@/types/profile";

export const toFormValues = (profile: Profile): ProfileFormValues => ({
  fullName: profile.fullName,
  email: profile.email,
  shopName: profile.shopName ?? "",
  shopDescription: profile.shopDescription ?? "",
  timezone: profile.timezone as ProfileFormValues["timezone"],
  language: profile.language as ProfileFormValues["language"],
  themePreference: (profile.themePreference ??
    DEFAULT_THEME) as ProfileFormValues["themePreference"],
  notificationEmailEnabled: profile.notificationEmailEnabled ?? false,
  newsletterSubscribed: profile.newsletterSubscribed ?? false,
  twoFactorEnabled: profile.twoFactorEnabled ?? false,
});
