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

    await test.step("the ticket endpoint is called with paging parameters", () => {
      const ticketCalls = findCalls(calls, "GET", "/api/support-tickets");
      expect(ticketCalls.length).toBeGreaterThan(0);
    });
  });

  test("BUG B4: ticket list fails with 500 in the E2E backend environment", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/support");

    await test.step("GET /api/support-tickets answers 5xx", async () => {
      await expect
        .poll(
          () => findCalls(calls, "GET", "/api/support-tickets")[0]?.status ?? 0,
          { timeout: 15_000 }
        )
        .toBeGreaterThanOrEqual(500);
    });

    await test.step("the page shows the recoverable failure state", async () => {
      await expect(page.getByRole("heading", { name: "Tickets could not be loaded" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Refresh/ })).toBeVisible();
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

  test("BUG B5: a failed ticket creation is silent in the composer", async ({ page }) => {
    const calls = recordApiCalls(page);
    const subject = `E2E ticket ${Date.now().toString(36)}`;

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

    await test.step("BUG: nothing tells the user the submit failed", async () => {
      await expect(dialog.getByRole("dialog")).toHaveCount(0);
      await expect(page.getByRole("alert").filter({ hasText: /.+/ })).toHaveCount(0);
      await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
      await expect(page).toHaveURL(/\/support\?compose=1/);
      await expect(dialog.getByLabel("Subject")).toHaveValue(subject);
    });

    await test.step("the composer is usable again for a retry", async () => {
      await expect(dialog.getByRole("button", { name: "Submit ticket" })).toBeEnabled();
    });
  });
});