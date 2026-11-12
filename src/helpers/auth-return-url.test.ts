import { afterEach, describe, expect, it, vi } from "vitest";

import { getSafeReturnUrl, resolveSignedInLanding } from "@/helpers/auth-return-url";
import { buildAuthenticatedUser } from "@/test/factories";

const visit = (search: string) => {
  window.history.replaceState({}, "", `/login${search}`);
};

describe("getSafeReturnUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    visit("");
  });

  it("keeps a relative return url", () => {
    visit("?returnUrl=%2Fsettings%2Fprofile");

    expect(getSafeReturnUrl()).toBe("/settings/profile");
  });

  it("keeps a relative return url with a query string", () => {
    visit("?returnUrl=%2Forders%3Fpage%3D2");

    expect(getSafeReturnUrl()).toBe("/orders?page=2");
  });

  it.each([
    ["no query string", ""],
    ["an unrelated query parameter", "?tab=security"],
    ["an empty return url", "?returnUrl="],
    ["an absolute url", "?returnUrl=https%3A%2F%2Fevil.test%2Fsteal"],
    ["a protocol relative url", "?returnUrl=%2F%2Fevil.test%2Fsteal"],
    ["a protocol relative url without a path", "?returnUrl=%2F%2Fevil.test"],
    ["a backslash prefixed url", "?returnUrl=%5C%5Cevil.test"],
    ["a slash then backslash url", "?returnUrl=%2F%5Cevil.test"],
    ["a slash then backslash url with a path", "?returnUrl=%2F%5Cevil.test%2Fphishing"],
    ["a path containing a backslash", "?returnUrl=%2Ffoo%5Cbar"],
    ["a relative segment", "?returnUrl=settings"],
  ])("falls back to the dashboard for %s", (_label, search) => {
    visit(search);

    expect(getSafeReturnUrl()).toBe("/dashboard");
  });

  it("keeps a root return url", () => {
    visit("?returnUrl=%2F");

    expect(getSafeReturnUrl()).toBe("/");
  });

  it("falls back to the dashboard when window is undefined", () => {
    vi.stubGlobal("window", undefined);

    expect(getSafeReturnUrl()).toBe("/dashboard");
  });
});

describe("resolveSignedInLanding", () => {
  const seller = buildAuthenticatedUser({ roles: ["Seller"] });
  const admin = buildAuthenticatedUser({ roles: ["Admin"] });
  const mixedCaseAdmin = buildAuthenticatedUser({ roles: ["ADMIN"] });

  it("returns the safe return url when provided", () => {
    expect(resolveSignedInLanding(seller, "/workflows")).toBe("/workflows");
  });

  it.each([
    ["an absolute url", "https://evil.test/phishing"],
    ["a protocol relative url", "//evil.test/phishing"],
    ["a slash then backslash url", "/\\evil.test"],
    ["a relative segment", "settings"],
    ["a path with a backslash", "/foo\\bar"],
    ["an empty string", ""],
  ])("ignores %s and resolves the role landing", (_label, returnUrl) => {
    expect(resolveSignedInLanding(seller, returnUrl)).toBe("/dashboard");
    expect(resolveSignedInLanding(admin, returnUrl)).toBe("/admin/dashboard");
  });

  it("resolves the seller landing by default", () => {
    expect(resolveSignedInLanding(seller)).toBe("/dashboard");
    expect(resolveSignedInLanding(seller, null)).toBe("/dashboard");
  });

  it("resolves the admin landing by default", () => {
    expect(resolveSignedInLanding(admin)).toBe("/admin/dashboard");
    expect(resolveSignedInLanding(admin, undefined)).toBe("/admin/dashboard");
  });

  it("matches the admin role case-insensitively", () => {
    expect(resolveSignedInLanding(mixedCaseAdmin)).toBe("/admin/dashboard");
  });
});
