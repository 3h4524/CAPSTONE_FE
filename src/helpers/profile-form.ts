import { DEFAULT_THEME } from "@/constants/profile";
import type { ProfileFormValues } from "@/schemas/profile";
import type { AccountVariant, Profile, UpdateProfilePayload } from "@/types/profile";

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

/**
 * Admins have no shop, no newsletter and mandatory email 2FA, so those fields are never sent for
 * them: a save from the admin profile cannot overwrite values the admin form does not show.
 */
export const toProfilePayload = (values: ProfileFormValues, variant: AccountVariant): UpdateProfilePayload => {
  if (variant === "seller") return values;

  const { shopName: _shopName, shopDescription: _shopDescription, newsletterSubscribed: _newsletter, twoFactorEnabled: _twoFactor, ...adminValues } = values;
  return adminValues;
};
