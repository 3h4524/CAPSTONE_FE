import { expect, test } from "@playwright/test";

import { findCalls, recordApiCalls } from "../support/api";
import { hasSellerSession } from "../support/auth";
import { openPrivateRoute, pageHeading } from "../support/private";

test.describe("seller dashboard", () => {
  test.beforeEach(() => {
    test.skip(!hasSellerSession(), "Seller storage state is missing; run the setup project first.");
  });

  test("loads behind the auth guard and resolves the seller session", async ({ page }) => {
    const calls = recordApiCalls(page);

    await test.step("open the dashboard", async () => {
      await openPrivateRoute(page, "/dashboard");
      await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    });

    await test.step("the session endpoint answered 200 exactly once", () => {
      const sessionCalls = findCalls(calls, "GET", "/api/auth/me");
      expect(sessionCalls).toHaveLength(1);
      expect(sessionCalls[0]?.status).toBe(200);
    });

    await test.step("the empty dashboard state is rendered", async () => {
      await expect(page.getByRole("heading", { name: "Start your first batch" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Create workflow" })).toBeDisabled();
      await expect(page.getByRole("link", { name: "View docs" })).toHaveAttribute(
        "href",
        "/features"
      );
    });
  });

  test("replaces the sign-in spinner with dashboard content", async ({ page }) => {
    await openPrivateRoute(page, "/dashboard");

    await expect(page.getByRole("status", { name: "Checking sign-in" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Start your first batch" })).toBeVisible();
  });

  test("navigates between private routes from the sidebar", async ({ page }) => {
    await openPrivateRoute(page, "/dashboard");

    const nav = page.getByRole("navigation", { name: "Primary" });

    await test.step("open batches", async () => {
      await nav.getByRole("link", { name: "Batches" }).click();
      await page.waitForURL(/\/batches$/);
      await expect(pageHeading(page, "Product batches")).toBeVisible();
      await expect(nav.getByRole("link", { name: "Batches" })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    await test.step("open support", async () => {
      await nav.getByRole("link", { name: "Support" }).click();
      await page.waitForURL(/\/support$/);
      await expect(pageHeading(page, "Support center")).toBeVisible();
    });
  });

  test("logs no console or page error while the dashboard settles", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await openPrivateRoute(page, "/dashboard");
    await expect(page.getByRole("heading", { name: "Start your first batch" })).toBeVisible();
    await page.waitForTimeout(1_000);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});