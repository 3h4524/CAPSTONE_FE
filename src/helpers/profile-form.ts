import type { ProfileFormValues } from "@/schemas/profile";
import type { AccountVariant, Profile, UpdateProfilePayload } from "@/types/profile";

export const toFormValues = (profile: Profile): ProfileFormValues => ({
  fullName: profile.fullName,
  email: profile.email,
  shopName: profile.shopName ?? "",
  shopDescription: profile.shopDescription ?? "",
});

/**
 * Admins have no shop, so those fields are never sent for them: a save from the admin profile
 * cannot overwrite values the admin form does not show.
 */
export const toProfilePayload = (values: ProfileFormValues, variant: AccountVariant): UpdateProfilePayload => {
  if (variant === "seller") return values;

  const { shopName: _shopName, shopDescription: _shopDescription, ...adminValues } = values;
  return adminValues;
};
