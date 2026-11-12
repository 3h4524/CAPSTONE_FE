import { describe, expect, it } from "vitest";

import { readProductConfigs, sameConfig, withoutProductConfigs, withProductConfig } from "@/helpers/product-video-configs";

const shared = { mode: "standard", durationSeconds: 6 };

describe("product video configs", () => {
  it("gives a product settings of its own without nesting the others' in them", () => {
    const withA = withProductConfig(shared, "a", { mode: "ai_shot", durationSeconds: 5 });
    const withB = withProductConfig(withA, "b", withA);

    expect(readProductConfigs(withB)).toEqual({ a: { mode: "ai_shot", durationSeconds: 5 }, b: shared });
  });

  it("drops the key once no product has settings of its own", () => {
    const withA = withProductConfig(shared, "a", { durationSeconds: 5 });

    expect(withProductConfig(withA, "a", null)).toEqual(shared);
  });

  it("reads the shared settings a product follows without the other products'", () => {
    expect(withoutProductConfigs({ ...shared, productConfigs: { a: {} } })).toEqual(shared);
  });

  it("compares settings whatever order their keys are in", () => {
    expect(sameConfig({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true);
    expect(sameConfig({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("ignores a malformed entry", () => {
    expect(readProductConfigs({ productConfigs: { a: "x", b: { mode: "standard" } } })).toEqual({ b: { mode: "standard" } });
  });
});
