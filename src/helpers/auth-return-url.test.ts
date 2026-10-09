import { afterEach, describe, expect, it, vi } from "vitest";

import { getSafeReturnUrl } from "@/helpers/auth-return-url";

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
