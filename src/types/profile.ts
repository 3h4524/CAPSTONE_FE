export type Profile = {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  shopName: string | null;
  shopDescription: string | null;
  timezone: string;
  language: string;
  themePreference: string | null;
  notificationEmailEnabled: boolean;
  newsletterSubscribed: boolean;
  twoFactorEnabled: boolean;
};

export type UpdateProfilePayload = {
  fullName?: string;
  email?: string;
  shopName?: string;
  shopDescription?: string;
  timezone?: string;
  language?: string;
  themePreference?: string;
  notificationEmailEnabled?: boolean;
  newsletterSubscribed?: boolean;
  twoFactorEnabled?: boolean;
};

/** Which account screens are showing: sellers manage a shop, admins only their own sign-in identity. */
export type AccountVariant = "seller" | "admin";
