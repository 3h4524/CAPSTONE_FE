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

  for (const path of ["/admin/users", "/admin/support-tickets"]) {
    test(`${path} redirects an anonymous visitor to /login without fetching admin data`, async ({ page }) => {
      const calls = recordApiCalls(page);

      await page.goto(path);
      await page.waitForURL(/\/login/, { timeout: ADMIN_ROUTE_TIMEOUT });

      expect(new URL(page.url()).searchParams.get("returnUrl")).toBe(path);
      expect(findCalls(calls, "GET", ADMIN_PATH)).toHaveLength(0);
    });
  }
});

test.describe("seller access to admin routes", () => {
  test("a signed-in seller is sent to the dashboard and no admin data is fetched", async ({ page }) => {
    test.skip(!hasSellerSession(), "Seller storage state is missing; run the setup project first.");

    const calls = recordApiCalls(page);

    await page.goto("/admin/users");
    await page.waitForURL(/\/dashboard/, { timeout: ADMIN_ROUTE_TIMEOUT });

    expect(findCalls(calls, "GET", ADMIN_PATH).filter((call) => call.status === 200)).toHaveLength(0);
    await expect(pageHeading(page, "Users Management")).toHaveCount(0);
  });
});
