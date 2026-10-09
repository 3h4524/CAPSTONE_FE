import { describe, expect, it } from "vitest";

import { toFormValues } from "@/helpers/profile-form";
import { profileSchema } from "@/schemas/profile";
import { buildProfile } from "@/test/factories";

describe("toFormValues", () => {
  it("maps a complete profile onto the form values", () => {
    expect(toFormValues(buildProfile())).toEqual({
      fullName: "Nhat Nguyen",
      email: "seller@apcs.test",
      shopName: "Nhat Prints",
      shopDescription: "Hand-picked designs printed on demand.",
      timezone: "Asia/Ho_Chi_Minh",
      language: "vi",
      themePreference: "system",
      notificationEmailEnabled: true,
      newsletterSubscribed: false,
      twoFactorEnabled: false,
    });
  });

  it("produces values that satisfy the profile schema", () => {
    const result = profileSchema.safeParse(toFormValues(buildProfile({ themePreference: null })));

    expect(result.success).toBe(true);
  });

  it("maps a null shop name and description onto empty strings", () => {
    expect(toFormValues(buildProfile({ shopName: null, shopDescription: null }))).toMatchObject({
      shopName: "",
      shopDescription: "",
    });
  });

  it("keeps an empty shop name and description as empty strings", () => {
    expect(toFormValues(buildProfile({ shopName: "", shopDescription: "" }))).toMatchObject({
      shopName: "",
      shopDescription: "",
    });
  });

  it.each(["light", "dark", "system"] as const)(
    "keeps the %s theme preference",
    (themePreference) => {
      expect(toFormValues(buildProfile({ themePreference })).themePreference).toBe(themePreference);
    }
  );

  it("falls back to the default theme when the preference is null", () => {
    expect(toFormValues(buildProfile({ themePreference: null })).themePreference).toBe("system");
  });

  it.each([
    ["English", "en"],
    ["Vietnamese", "vi"],
  ] as const)("keeps the %s language code", (_label, language) => {
    expect(toFormValues(buildProfile({ language })).language).toBe(language);
  });

  it.each(["Asia/Ho_Chi_Minh", "Asia/Tokyo", "UTC"] as const)(
    "keeps the %s timezone",
    (timezone) => {
      expect(toFormValues(buildProfile({ timezone })).timezone).toBe(timezone);
    }
  );

  it("passes every boolean flag through as true", () => {
    const profile = buildProfile({
      notificationEmailEnabled: true,
      newsletterSubscribed: true,
      twoFactorEnabled: true,
    });

    expect(toFormValues(profile)).toMatchObject({
      notificationEmailEnabled: true,
      newsletterSubscribed: true,
      twoFactorEnabled: true,
    });
  });

  it("passes every boolean flag through as false", () => {
    const profile = buildProfile({
      notificationEmailEnabled: false,
      newsletterSubscribed: false,
      twoFactorEnabled: false,
    });

    expect(toFormValues(profile)).toMatchObject({
      notificationEmailEnabled: false,
      newsletterSubscribed: false,
      twoFactorEnabled: false,
    });
  });

  it("does not mutate the source profile", () => {
    const profile = buildProfile({ themePreference: null });

    toFormValues(profile);

    expect(profile.themePreference).toBeNull();
  });
});
