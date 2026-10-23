import { expect, test } from "@playwright/test";

import { findCalls, recordApiCalls } from "../support/api";
import { hasSellerSession } from "../support/auth";
import { openPrivateRoute } from "../support/private";

test.describe("support ticket composer", () => {
  test.beforeEach(() => {
    test.skip(!hasSellerSession(), "Seller storage state is missing; run the setup project first.");
  });

  test("exposes the full ticket form with defaults", async ({ page }) => {
    const calls = recordApiCalls(page);

    await test.step("open the composer from the support page", async () => {
      await openPrivateRoute(page, "/support");
      await page.getByRole("button", { name: /New ticket/ }).first().click();
      await page.waitForURL(/\/support\?compose=1/);

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Contact support" })).toBeVisible();
    });

    await test.step("subject, description and attachment dropzone are present", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("Subject")).toBeVisible();
      await expect(dialog.getByLabel("Description")).toBeVisible();
      await expect(dialog.getByText(/attachments/i)).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Submit ticket" })).toBeVisible();
    });

    await test.step("category and priority offer their option lists", async () => {
      const dialog = page.getByRole("dialog");

      await dialog.getByLabel("Category").click();
      await expect(page.getByRole("option", { name: "Billing & subscription" })).toBeVisible();
      await page.keyboard.press("Escape");

      await dialog.getByLabel("Priority").click();
      await expect(page.getByRole("option", { name: /urgent/i }).last()).toBeVisible();
      await page.keyboard.press("Escape");
    });

    await test.step("inspecting the form issued no ticket request", () => {
      expect(findCalls(calls, "POST", "/api/support-tickets")).toHaveLength(0);
    });

    await test.step("the composer closes back to the support page", async () => {
      await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });
  });
});
