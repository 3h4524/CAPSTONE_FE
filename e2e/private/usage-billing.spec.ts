import { expect, test } from "@playwright/test";

import { findCalls, recordApiCalls } from "../support/api";
import { hasSellerSession } from "../support/auth";
import { openPrivateRoute, pageHeading } from "../support/private";

test.describe("usage and billing", () => {
  test.beforeEach(() => {
    test.skip(!hasSellerSession(), "Seller storage state is missing; run the setup project first.");
  });

  test("loads the usage overview from the API", async ({ page }) => {
    const calls = recordApiCalls(page);

    await test.step("open the usage page", async () => {
      await openPrivateRoute(page, "/usage");
      await expect(pageHeading(page, "Usage")).toBeVisible();
    });

    await test.step("GET /api/usage answered 200", async () => {
      await expect
        .poll(() => findCalls(calls, "GET", "/api/usage")[0]?.status, { timeout: 15_000 })
        .toBe(200);
    });

    await test.step("the summary cards are rendered", async () => {
      await expect(page.getByText("Design images")).toBeVisible();
      await expect(page.getByText("Videos rendered")).toBeVisible();
      await expect(page.getByText("Listings exported")).toBeVisible();
      await expect(page.getByText("Estimated API cost")).toBeVisible();
    });

    await test.step("the allowance and cost detail are rendered", async () => {
      await expect(page.getByText("Credit allowance")).toBeVisible();
      await expect(page.getByText("Generation volume")).toBeVisible();
      await expect(page.getByText("By provider")).toBeVisible();
      await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
    });
  });

  test("switching the usage range refetches the overview", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/usage");
    await expect(pageHeading(page, "Usage")).toBeVisible();

    await expect
      .poll(() => findCalls(calls, "GET", "/api/usage").length, { timeout: 15_000 })
      .toBe(1);

    await test.step("choosing 90 days issues one more overview request", async () => {
      await page.getByRole("button", { name: "90 days" }).click();

      await expect
        .poll(() => findCalls(calls, "GET", "/api/usage").length, { timeout: 10_000 })
        .toBe(2);
      expect(findCalls(calls, "GET", "/api/usage").every((call) => call.status === 200)).toBe(true);
    });
  });

  test("loads the subscription overview from the API", async ({ page }) => {
    const calls = recordApiCalls(page);

    await test.step("open the subscription page", async () => {
      await openPrivateRoute(page, "/subscription");
      await expect(pageHeading(page, "Subscription")).toBeVisible();
    });

    await test.step("GET /api/subscriptions/overview answered 200", async () => {
      await expect
        .poll(() => findCalls(calls, "GET", "/api/subscriptions/overview")[0]?.status, {
          timeout: 15_000,
        })
        .toBe(200);
    });

    await test.step("the current plan and catalog sections are rendered", async () => {
      await expect(page.getByText("Current plan", { exact: true })).toBeVisible();
      await expect(page.getByText("Choose the right capacity")).toBeVisible();
    });
  });
});
