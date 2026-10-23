import { cookies } from "next/headers";
import { notFound, redirect, usePathname, useRouter, useSearchParams } from "next/navigation";
import { describe, expect, it } from "vitest";

// Proves the `next/*` aliases in vitest.config.mts resolve, because Next ships no public provider
// for these modules: without them every component test that touches `useRouter` or `cookies` dies
// on import, and a silent alias regression would only surface halfway through Wave 2.
describe("next module mocks", () => {
  it("useRouter exposes the navigation methods components call", () => {
    const router = useRouter();

    expect(router.push).toBeTypeOf("function");
    expect(router.replace).toBeTypeOf("function");
    expect(router.back).toBeTypeOf("function");
    expect(router.refresh).toBeTypeOf("function");
    expect(router.prefetch).toBeTypeOf("function");
  });

  it("usePathname and useSearchParams return url-shaped values", () => {
    expect(usePathname()).toBe("/");
    expect(useSearchParams()).toBeInstanceOf(URLSearchParams);
  });

  it("redirect and notFound are callable", () => {
    expect(redirect).toBeTypeOf("function");
    expect(notFound).toBeTypeOf("function");
  });

  it("cookies() resolves a request cookie store", async () => {
    const store = await cookies();

    expect(store.get("accessToken")?.value).toBe("test-access-token");
    expect(store.toString()).toBe("accessToken=test-access-token");
  });
});