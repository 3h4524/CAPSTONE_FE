import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { findCalls, recordApiCalls } from "../support/api";
import { hasSellerSession } from "../support/auth";
import { openPrivateRoute, uniqueLabel } from "../support/private";

/**
 * `reset(toFormValues(data))` runs after the profile query resolves, so reading a field before the
 * email arrives would compare against the empty default value rather than the seeded seller.
 */
const waitForProfileForm = async (page: Page, email: string) => {
  await expect(page.getByLabel("Business email")).toHaveValue(email);
};

test.describe("seller profile", () => {
  test.beforeEach(() => {
    test.skip(!hasSellerSession(), "Seller storage state is missing; run the setup project first.");
  });

  test("shows the seeded seller identity", async ({ page }) => {
    const email = process.env.E2E_SELLER_EMAIL as string;

    await openPrivateRoute(page, "/profile");
    await waitForProfileForm(page, email);

    await test.step("the personal form is prefilled from the API", async () => {
      await expect(page.getByRole("main").getByRole("heading", { name: "Profile", level: 1 })).toBeVisible();
      await expect(page.getByLabel("Business email")).toHaveValue(email);
      await expect(page.getByLabel("Full name")).not.toHaveValue("");
    });

    await test.step("the avatar card repeats the same email", async () => {
      await expect(page.getByText(email, { exact: true })).toHaveCount(2);
    });

    await test.step("save is disabled while the form is pristine", async () => {
      await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
    });
  });

  test("persists a shop name edit across a reload", async ({ page }) => {
    const shopName = uniqueLabel("E2E shop");

    await test.step("edit the shop name", async () => {
      await openPrivateRoute(page, "/profile");
      await waitForProfileForm(page, process.env.E2E_SELLER_EMAIL as string);

      const shopNameField = page.getByLabel("Shop name");
      await expect(shopNameField).toBeEditable();
      await shopNameField.fill(shopName);

      await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled();
      await expect(page.getByRole("button", { name: "Discard" })).toBeEnabled();
    });

    await test.step("saving issues PATCH /api/profile", async () => {
      const [response] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.url().endsWith("/api/profile") &&
            candidate.request().method() === "PATCH"
        ),
        page.getByRole("button", { name: "Save changes" }).click(),
      ]);

      expect(response.status()).toBe(200);
    });

    await test.step("the new value survives a full reload", async () => {
      await page.reload();
      await waitForProfileForm(page, process.env.E2E_SELLER_EMAIL as string);

      await expect(page.getByLabel("Shop name")).toHaveValue(shopName);
      await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
    });
  });

  test("discards an unsaved edit", async ({ page }) => {
    await openPrivateRoute(page, "/profile");
    await waitForProfileForm(page, process.env.E2E_SELLER_EMAIL as string);

    const shopNameField = page.getByLabel("Shop name");
    const original = await shopNameField.inputValue();

    await shopNameField.fill(uniqueLabel("discarded"));
    await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled();

    await page.getByRole("button", { name: "Discard" }).click();

    await expect(shopNameField).toHaveValue(original);
    await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  test("rejects an empty full name without calling the API", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/profile");
    await waitForProfileForm(page, process.env.E2E_SELLER_EMAIL as string);

    await page.getByLabel("Full name").fill("");

    await test.step("zod surfaces the required-field message inside the form", async () => {
      const form = page
        .getByRole("button", { name: "Save changes" })
        .locator("xpath=ancestor::form");

      await form.getByRole("button", { name: "Save changes" }).click();
      await expect(form.getByRole("alert").first()).toHaveText("Full name is required");
    });

    await test.step("no update request left the browser", () => {
      expect(findCalls(calls, "PATCH", "/api/profile")).toHaveLength(0);
    });
  });

  test("reads the profile through the single HTTP client", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/profile");
    await waitForProfileForm(page, process.env.E2E_SELLER_EMAIL as string);

    const profileCalls = findCalls(calls, "GET", "/api/profile");
    expect(profileCalls[0]?.status).toBe(200);
    expect(findCalls(calls, "GET", "/api/auth/me")[0]?.status).toBe(200);
  });
});