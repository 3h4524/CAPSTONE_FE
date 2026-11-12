import { describe, expect, it } from "vitest";

import { toFormValues } from "@/helpers/profile-form";
import { profileSchema } from "@/schemas/profile";
import { buildProfile } from "@/test/factories";

describe("toFormValues", () => {
  it("maps a complete profile onto the personal form values", () => {
    expect(toFormValues(buildProfile())).toEqual({
      fullName: "Nhat Nguyen",
      email: "seller@apcs.test",
      shopName: "Nhat Prints",
      shopDescription: "Hand-picked designs printed on demand.",
    });
  });

  it("produces values that satisfy the profile schema", () => {
    const result = profileSchema.safeParse(toFormValues(buildProfile({ shopName: null })));

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

  it("does not mutate the source profile", () => {
    const profile = buildProfile({ shopName: null });

    toFormValues(profile);

    expect(profile.shopName).toBeNull();
  });
});
