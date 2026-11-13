import { describe, expect, it } from "vitest";

import { counterpartMockup, mainMockup } from "@/helpers/main-mockup";
import type { MockupAsset } from "@/types/video-workflow";

const asset = (id: string, overrides: Partial<MockupAsset> = {}) =>
  ({ id, role: "Hero", variantKey: "#FFFFFF", mockupTemplateId: "template", ...overrides }) as MockupAsset;

describe("mainMockup", () => {
  it("prefers a Hero, then the color code in plain order (the black shirt's code sorts first)", () => {
    const black = asset("b", { variantKey: "#1A1A1A" });
    const white = asset("w", { variantKey: "#FFFFFF" });
    const back = asset("x", { role: "AlternativeAngle", variantKey: "#1A1A1A" });

    expect(mainMockup([back, white, black])?.id).toBe("b");
  });

  it("takes one made from a template before an upload of the same role", () => {
    const upload = asset("u", { mockupTemplateId: null, variantKey: "#000000" });
    const composite = asset("c", { variantKey: "#FFFFFF" });

    expect(mainMockup([upload, composite])?.id).toBe("c");
  });

  it("falls back to another role when there is no Hero, and is undefined for none", () => {
    expect(mainMockup([asset("a", { role: "Lifestyle" })])?.id).toBe("a");
    expect(mainMockup([])).toBeUndefined();
  });
});

describe("counterpartMockup", () => {
  it("keeps an image of this design", () => {
    const own = asset("own");
    expect(counterpartMockup("own", [], [own])?.id).toBe("own");
  });

  it("finds this design's image of the same template and color", () => {
    const chosen = asset("other", { variantKey: "#9EA3A8", mockupTemplateId: "front" });
    const gray = asset("gray", { variantKey: "#9ea3a8", mockupTemplateId: "front" });
    const white = asset("white", { variantKey: "#FFFFFF", mockupTemplateId: "front" });

    expect(counterpartMockup("other", [chosen], [white, gray])?.id).toBe("gray");
  });

  it("falls back to the same role for an upload, but never matches the default Hero by role", () => {
    const lifestyle = asset("life", { role: "Lifestyle", mockupTemplateId: null });
    const ownLifestyle = asset("mine", { role: "Lifestyle", mockupTemplateId: null });
    const upload = asset("hero", { mockupTemplateId: null });

    expect(counterpartMockup("life", [lifestyle], [ownLifestyle])?.id).toBe("mine");
    expect(counterpartMockup("hero", [upload], [asset("x", { mockupTemplateId: null })])).toBeUndefined();
  });

  it("knows nothing of an image it has not loaded", () => {
    expect(counterpartMockup("missing", [], [asset("a")])).toBeUndefined();
  });
});
