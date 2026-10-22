import { expect, test } from "@playwright/test";

import { findCalls, recordApiCalls } from "../support/api";
import { hasSellerSession } from "../support/auth";
import { pageHeading } from "../support/private";

const ADMIN_PATH = /^\/api\/admin\//;
const ADMIN_ROUTE_TIMEOUT = 20_000;

/**
 * These specs deliberately run without storageState: the `authenticated` project always applies one,
 * so a clean context has to be built here to observe what an anonymous visitor really sees.
 */
test.describe("anonymous access to private routes", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects /dashboard to the sign-in page with a returnUrl", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    await test.step("the client-side guard replaces the URL with /login", async () => {
      await page.waitForURL(/\/login/, { timeout: ADMIN_ROUTE_TIMEOUT });
    });

    await test.step("the returnUrl points back at the original route", () => {
      expect(new URL(page.url()).searchParams.get("returnUrl")).toBe("/dashboard");
    });

    await test.step("the sign-in form is actually rendered", async () => {
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    });
  });

  test("redirects /profile and /api-keys to the sign-in page", async ({ page }) => {
    for (const path of ["/profile", "/api-keys"]) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");

      await page.waitForURL(/\/login/, { timeout: ADMIN_ROUTE_TIMEOUT });
      expect(new URL(page.url()).searchParams.get("returnUrl")).toBe(path);
    }
  });

  test("keeps the query string in the returnUrl", async ({ page }) => {
    await page.goto("/support?compose=1");
    await page.waitForLoadState("domcontentloaded");

    await page.waitForURL(/\/login/, { timeout: ADMIN_ROUTE_TIMEOUT });
    expect(new URL(page.url()).searchParams.get("returnUrl")).toBe("/support?compose=1");
  });
});

test.describe("anonymous access to admin routes", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("BUG B1: /admin/users stays put and fires admin queries without a session", async ({ page }) => {
    const calls = recordApiCalls(page);

    await page.goto("/admin/users");
    await page.waitForLoadState("domcontentloaded");

    await test.step("BUG: the URL never becomes /login", async () => {
      await page.waitForTimeout(5_000);
      expect(page.url()).toContain("/admin/users");
    });

    await test.step("BUG: three admin endpoints are called by an anonymous visitor", async () => {
      await expect
        .poll(() => findCalls(calls, "GET", ADMIN_PATH).length, { timeout: ADMIN_ROUTE_TIMEOUT })
        .toBeGreaterThan(0);

      const paths = new Set(findCalls(calls, "GET", ADMIN_PATH).map((call) => call.path));
      expect(paths.has("/api/admin/users")).toBe(true);
      expect(paths.has("/api/admin/dashboard/metrics")).toBe(true);
      expect(paths.has("/api/admin/users/plans")).toBe(true);
    });

    await test.step("the refresh interceptor loops on 401", () => {
      const refreshCalls = findCalls(calls, "POST", "/api/auth/refresh");
      expect(refreshCalls.length).toBeGreaterThan(1);
      expect(refreshCalls.every((call) => call.status === 401)).toBe(true);
    });

    await test.step("no data leaks: the backend answers 401 and the table stays empty", async () => {
      const adminCalls = findCalls(calls, "GET", ADMIN_PATH);
      expect(adminCalls.every((call) => call.status === 401)).toBe(true);

      await expect(page.getByText(/Showing \d+ of \d+ users/)).toHaveCount(0);
      await expect(page.getByRole("row")).toHaveCount(0);
    });

    await test.step("the UI is stuck on the redirect placeholder", async () => {
      await expect(page.getByRole("status", { name: "Redirecting..." })).toBeVisible();
      await expect(pageHeading(page, "Users Management")).toHaveCount(0);
    });
  });

  test("BUG B2: /admin/support-tickets stays put for an anonymous visitor", async ({ page }) => {
    const calls = recordApiCalls(page);

    await page.goto("/admin/support-tickets");
    await page.waitForLoadState("domcontentloaded");

    await test.step("BUG: the URL never becomes /login", async () => {
      await page.waitForTimeout(5_000);
      expect(page.url()).toContain("/admin/support-tickets");
    });

    await test.step("the session probe answers 401 and the placeholder shows", async () => {
      await expect
        .poll(() => findCalls(calls, "GET", "/api/auth/me")[0]?.status, {
          timeout: ADMIN_ROUTE_TIMEOUT,
        })
        .toBe(401);

      await expect(page.getByRole("status", { name: "Redirecting..." })).toBeVisible();
    });

    await test.step("no admin ticket data is fetched", () => {
      expect(findCalls(calls, "GET", "/api/admin/support-tickets")).toHaveLength(0);
    });
  });

});

test.describe("seller access to admin routes", () => {
  test("BUG B3: a signed-in seller also stays on /admin/users", async ({ page }) => {
    test.skip(!hasSellerSession(), "Seller storage state is missing; run the setup project first.");

    const calls = recordApiCalls(page);

    await page.goto("/admin/users");
    await page.waitForLoadState("domcontentloaded");

    await test.step("BUG: a non-admin session is not redirected either", async () => {
      await page.waitForTimeout(5_000);
      expect(page.url()).toContain("/admin/users");
    });

    await test.step("the session resolves but the admin query is still attempted", async () => {
      await expect
        .poll(() => findCalls(calls, "GET", "/api/auth/me")[0]?.status, {
          timeout: ADMIN_ROUTE_TIMEOUT,
        })
        .toBe(200);

      await expect
        .poll(() => findCalls(calls, "GET", "/api/admin/users").length, {
          timeout: ADMIN_ROUTE_TIMEOUT,
        })
        .toBeGreaterThan(0);
    });

    await test.step("the backend refuses the seller with 403", () => {
      expect(findCalls(calls, "GET", "/api/admin/users")[0]?.status).toBe(403);
    });

    await test.step("the UI is stuck on the redirect placeholder", async () => {
      await expect(page.getByRole("status", { name: "Redirecting..." })).toBeVisible();
      await expect(pageHeading(page, "Users Management")).toHaveCount(0);
    });
  });
});