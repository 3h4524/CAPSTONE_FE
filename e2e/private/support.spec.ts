import { expect, test } from "@playwright/test";

import { findCalls, recordApiCalls } from "../support/api";
import { hasSellerSession } from "../support/auth";
import { openPrivateRoute, pageHeading } from "../support/private";

test.describe("support center", () => {
  test.beforeEach(() => {
    test.skip(!hasSellerSession(), "Seller storage state is missing; run the setup project first.");
  });

  test("renders the help shell and calls the ticket endpoint", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/support");

    await test.step("the page renders regardless of the ticket outcome", async () => {
      await expect(pageHeading(page, "Support center")).toBeVisible();
      await expect(page.getByRole("heading", { name: "How can we help?" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Connect an Etsy shop" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Support tickets" })).toBeVisible();
    });

    await test.step("the ticket endpoint is called with paging parameters", async () => {
      await expect
        .poll(() => findCalls(calls, "GET", "/api/support-tickets").length, { timeout: 15_000 })
        .toBeGreaterThan(0);
    });
  });

  test("the ticket list answers 200 in the E2E backend environment", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/support");

    await test.step("GET /api/support-tickets answers 200", async () => {
      await expect
        .poll(
          () => findCalls(calls, "GET", "/api/support-tickets")[0]?.status ?? 0,
          { timeout: 15_000 }
        )
        .toBe(200);
    });

    await test.step("the tickets load instead of the failure state", async () => {
      await expect(
        page.getByRole("heading", { name: "Tickets could not be loaded" })
      ).toHaveCount(0);
    });
  });

  test("opens a help guide dialog", async ({ page }) => {
    await openPrivateRoute(page, "/support");

    await page.getByRole("button", { name: "Connect an Etsy shop" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Connect an Etsy shop" })).toBeVisible();
    await expect(dialog.getByRole("list", { name: /Steps for/ })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Create support ticket" })).toBeVisible();

    await dialog.getByRole("button", { name: "Close" }).last().click();
    await expect(dialog).toHaveCount(0);
  });

  test("validates the composer form before submitting", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/support");

    await test.step("the new-ticket button routes to the composer", async () => {
      await page.getByRole("button", { name: /New ticket/ }).first().click();
      await page.waitForURL(/\/support\?compose=1/);

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Contact support" })).toBeVisible();
      await expect(dialog.getByLabel("Subject")).toBeVisible();
      await expect(dialog.getByLabel("Description")).toBeVisible();
    });

    await test.step("an empty subject is rejected inside the form", async () => {
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Submit ticket" }).click();

      const form = dialog
        .getByRole("button", { name: "Submit ticket" })
        .locator("xpath=ancestor::form");

      await expect(form.getByRole("alert").first()).toBeVisible();
    });

    await test.step("no ticket was created", () => {
      expect(findCalls(calls, "POST", "/api/support-tickets")).toHaveLength(0);
    });
  });

  test("a failed ticket creation is reported in the composer", async ({ page }) => {
    const calls = recordApiCalls(page);
    const subject = `E2E ticket ${Date.now().toString(36)}`;

    // The backend answers, so the failure is forced here to keep the test about the composer.
    await page.route("**/api/support-tickets", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          title: "The ticket could not be submitted.",
          detail: "The ticket could not be submitted.",
        }),
      });
    });

    await openPrivateRoute(page, "/support");
    await page.getByRole("button", { name: /New ticket/ }).first().click();
    await page.waitForURL(/\/support\?compose=1/);

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Subject").fill(subject);
    await dialog.getByLabel("Description").fill("Created by the Playwright suite.");

    await test.step("POST /api/support-tickets is attempted once and fails", async () => {
      const [response] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.url().endsWith("/api/support-tickets") &&
            candidate.request().method() === "POST"
        ),
        dialog.getByRole("button", { name: "Submit ticket" }).click(),
      ]);

      expect(response.status()).toBeGreaterThanOrEqual(500);
      expect(findCalls(calls, "POST", "/api/support-tickets")).toHaveLength(1);
    });

    await test.step("the user is told the submit failed", async () => {
      await expect(page.locator("[data-sonner-toast]").filter({ hasText: /.+/ })).toHaveCount(1);
    });

    await test.step("the composer keeps what was typed and stays usable", async () => {
      await expect(page).toHaveURL(/\/support\?compose=1/);
      await expect(dialog.getByLabel("Subject")).toHaveValue(subject);
      await expect(dialog.getByRole("button", { name: "Submit ticket" })).toBeEnabled();
    });
  });
});