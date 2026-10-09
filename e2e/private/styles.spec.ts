import { expect, test } from "@playwright/test";

import { findCalls, recordApiCalls } from "../support/api";
import { hasSellerSession } from "../support/auth";
import { openPrivateRoute, pageHeading } from "../support/private";

test.describe("art styles", () => {
  test.beforeEach(() => {
    test.skip(!hasSellerSession(), "Seller storage state is missing; run the setup project first.");
  });

  test("renders the styles page shell", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/styles");

    await test.step("the heading and the create action are rendered", async () => {
      await expect(pageHeading(page, "My Styles")).toBeVisible();
      await expect(page.getByRole("button", { name: "New style" }).first()).toBeVisible();
    });

    await test.step("GET /api/style-art-presets was called", () => {
      expect(findCalls(calls, "GET", "/api/style-art-presets").length).toBeGreaterThan(0);
    });
  });

  test("BUG B6: preset loading fails with 500 and the page shows the error state", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/styles");

    await test.step("GET /api/style-art-presets answers 5xx", async () => {
      await expect
        .poll(
          () => findCalls(calls, "GET", "/api/style-art-presets")[0]?.status ?? 0,
          { timeout: 15_000 }
        )
        .toBeGreaterThanOrEqual(500);
    });

    await test.step("the recoverable error state is shown", async () => {
      const alert = page.getByRole("alert");
      await expect(alert.getByText("Art styles unavailable")).toBeVisible();
      await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
    });

    await test.step("retrying re-issues the same request", async () => {
      const before = findCalls(calls, "GET", "/api/style-art-presets").length;

      await page.getByRole("alert").getByRole("button", { name: "Try again" }).click();

      await expect
        .poll(() => findCalls(calls, "GET", "/api/style-art-presets").length, {
          timeout: 10_000,
        })
        .toBeGreaterThan(before);
    });
  });

  test("the new-style dialog validates before any request", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/styles");
    await page.getByRole("button", { name: "New style" }).first().click();

    const dialog = page.getByRole("dialog");
    await test.step("the dialog opens with an empty form", async () => {
      await expect(dialog.getByRole("heading", { name: "New art style" })).toBeVisible();
      await expect(dialog.getByPlaceholder("Neon Glow")).toHaveValue("");
    });

    await test.step("no create request left the browser", () => {
      expect(findCalls(calls, "POST", "/api/style-art-presets")).toHaveLength(0);
    });
  });
});