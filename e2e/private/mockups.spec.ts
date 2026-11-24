import { expect, test } from "@playwright/test";

import { findCalls, recordApiCalls } from "../support/api";
import { hasSellerSession } from "../support/auth";
import { openPrivateRoute, pageHeading } from "../support/private";

test.describe("mockup templates and model photos", () => {
  test.beforeEach(() => {
    test.skip(!hasSellerSession(), "Seller storage state is missing; run the setup project first.");
  });

  test("renders the mockups page shell with product photos tab by default", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/mockups");

    await test.step("the page heading, tabs, and create action are rendered", async () => {
      await expect(pageHeading(page, "Mock-up Templates")).toBeVisible();
      await expect(page.getByRole("tab", { name: /Product photos/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Model photos/i })).toBeVisible();
      await expect(page.getByRole("button", { name: "New template" })).toBeVisible();
    });

    await test.step("mockup templates endpoint answered", async () => {
      await expect
        .poll(() => findCalls(calls, "GET", "/api/mockup-templates").length, { timeout: 15_000 })
        .toBeGreaterThan(0);
    });
  });

  test("new template dialog opens with name, category, and view configuration fields", async ({ page }) => {
    await openPrivateRoute(page, "/mockups");
    await page.getByRole("button", { name: "New template" }).click();

    const dialog = page.getByRole("dialog");
    await test.step("the template dialog renders fields", async () => {
      await expect(dialog.getByRole("heading", { name: "New mock-up template" })).toBeVisible();
      await expect(dialog.getByLabel(/Template name/i)).toBeVisible();
      await expect(dialog.getByRole("combobox", { name: /Product type/i })).toBeVisible();
      await expect(dialog.getByLabel(/Description/i)).toBeVisible();
    });

    await dialog.getByRole("button", { name: /Cancel|Close/i }).first().click();
    await expect(dialog).toBeHidden();
  });

  test("switches to the Model photos tab and displays model attributes filters", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/mockups");
    await page.getByRole("tab", { name: /Model photos/i }).click();

    await test.step("the model photos panel renders actions", async () => {
      await expect(page.getByRole("button", { name: "Make with AI" })).toBeVisible();
      await expect(page.getByRole("button", { name: "New model photo" })).toBeVisible();
    });

    await test.step("model photos query was dispatched", async () => {
      await expect
        .poll(
          () =>
            findCalls(calls, "GET", "/api/mockup-templates").length +
            findCalls(calls, "GET", "/api/model-photos").length,
          { timeout: 15_000 }
        )
        .toBeGreaterThan(0);
    });
  });

  test("opens the AI model photo generator dialog with styling controls", async ({ page }) => {
    await openPrivateRoute(page, "/mockups");
    await page.getByRole("tab", { name: /Model photos/i }).click();
    await page.getByRole("button", { name: "Make with AI" }).click();

    const dialog = page.getByRole("dialog");
    await test.step("the AI generator dialog opens with controls", async () => {
      await expect(dialog.getByRole("heading", { name: "Make a model photo with AI" })).toBeVisible();
      await expect(dialog.getByRole("combobox", { name: /Product type/i })).toBeVisible();
      await expect(dialog.getByRole("combobox", { name: /Scene/i })).toBeVisible();
      await expect(dialog.getByRole("combobox", { name: /Outfit/i })).toBeVisible();
      await expect(dialog.getByRole("combobox", { name: /Pose/i })).toBeVisible();
    });

    await dialog.getByRole("button", { name: /Cancel|Close/i }).first().click();
    await expect(dialog).toBeHidden();
  });

  test("opens the manual model photo upload dialog", async ({ page }) => {
    await openPrivateRoute(page, "/mockups");
    await page.getByRole("tab", { name: /Model photos/i }).click();
    await page.getByRole("button", { name: "New model photo" }).click();

    const dialog = page.getByRole("dialog");
    await test.step("the upload dialog renders attributes fields", async () => {
      await expect(dialog.getByRole("heading", { name: "New model photo" })).toBeVisible();
      await expect(dialog.getByLabel(/Name/i).first()).toBeVisible();
    });

    await dialog.getByRole("button", { name: /Cancel|Close/i }).first().click();
    await expect(dialog).toBeHidden();
  });
});
