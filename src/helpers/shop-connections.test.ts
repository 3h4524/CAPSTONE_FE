import { describe, expect, it } from "vitest";

import { API_KEYS_PATH, publishConnectionIssue, SHOP_PATH } from "@/helpers/shop-connections";

describe("publishConnectionIssue", () => {
  it("points a missing Printify key to API Keys", () => {
    expect(publishConnectionIssue("publish-printify", { printify: "not_connected" })?.href).toBe(API_KEYS_PATH);
    expect(publishConnectionIssue("publish-printify", { printify: "key_invalid" })?.href).toBe(API_KEYS_PATH);
  });

  it("points a Printify account without a store to the Shop page", () => {
    expect(publishConnectionIssue("publish-printify", { printify: "no_store" })?.href).toBe(SHOP_PATH);
  });

  it("points a missing or expired Etsy connection to the Shop page", () => {
    expect(publishConnectionIssue("publish-etsy", { etsy: "not_connected" })?.href).toBe(SHOP_PATH);
    expect(publishConnectionIssue("publish-etsy", { etsy: "reconnect_required" })?.message).toContain("again");
  });

  it("does not block a connected, unreachable or still loading shop", () => {
    expect(publishConnectionIssue("publish-printify", { printify: "connected" })).toBeNull();
    expect(publishConnectionIssue("publish-printify", { printify: "unavailable" })).toBeNull();
    expect(publishConnectionIssue("publish-etsy", { etsy: "unavailable" })).toBeNull();
    expect(publishConnectionIssue("publish-etsy", {})).toBeNull();
  });

  it("only looks at the shop the step publishes to", () => {
    expect(publishConnectionIssue("publish-etsy", { printify: "not_connected", etsy: "connected" })).toBeNull();
    expect(publishConnectionIssue("export-zip", { etsy: "not_connected", printify: "not_connected" })).toBeNull();
  });
});
