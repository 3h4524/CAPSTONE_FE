import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { findCalls, recordApiCalls } from "../support/api";
import { hasSellerSession } from "../support/auth";
import { openPrivateRoute, uniqueLabel } from "../support/private";

const openNewWorkflowDialog = async (page: Page) => {
  await page.locator("button:has(.lucide-chevrons-up-down)").click();
  await page.getByRole("menuitem", { name: "New workflow" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "New workflow" })).toBeVisible();
  return dialog;
};

test.describe("workflow editor", () => {
  test.beforeEach(() => {
    test.skip(!hasSellerSession(), "Seller storage state is missing; run the setup project first.");
  });

  test("loads the editor behind the auth guard", async ({ page }) => {
    const calls = recordApiCalls(page);

    await test.step("open the workflows page", async () => {
      await openPrivateRoute(page, "/workflows");
    });

    await test.step("the seller session resolves", async () => {
      await expect
        .poll(() => findCalls(calls, "GET", "/api/auth/me")[0]?.status, { timeout: 15_000 })
        .toBe(200);
    });

    await test.step("the toolbar and canvas chrome are rendered", async () => {
      await expect(page.getByRole("button", { name: "Validate" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Run demo" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
      await expect(page.locator("button:has(.lucide-chevrons-up-down)")).toBeVisible();
    });
  });

  test("rejects an empty workflow name without creating", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/workflows");
    await expect(page.getByRole("button", { name: "Validate" })).toBeVisible();

    const dialog = await test.step("open the new-workflow dialog", () =>
      openNewWorkflowDialog(page)
    );

    await test.step("zod reports the short name inside the dialog", async () => {
      await dialog.getByLabel("Name").fill("");
      await dialog.getByRole("button", { name: "Create workflow" }).click();

      await expect(dialog.getByRole("alert").first()).toContainText(/at least 2 characters/i);
      await expect(
        dialog.getByRole("heading", { name: "New workflow" })
      ).toBeVisible();
    });

    await test.step("no backend request was issued for the invalid name", () => {
      expect(calls.filter((call) => call.method === "POST")).toHaveLength(0);
    });

    await test.step("closing the dialog leaves the editor usable", async () => {
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Validate" })).toBeEnabled();
    });
  });

  test("creates a workflow and deletes it again", async ({ page }) => {
    const workflowName = uniqueLabel("E2E workflow");

    await openPrivateRoute(page, "/workflows");
    await expect(page.getByRole("button", { name: "Validate" })).toBeVisible();

    await test.step("create the workflow from the switcher", async () => {
      const dialog = await openNewWorkflowDialog(page);
      await dialog.getByLabel("Name").fill(workflowName);
      await dialog.getByLabel("Description").fill("Created by the Playwright suite.");
      await dialog.getByRole("button", { name: "Create workflow" }).click();

      await expect(page.locator("[data-sonner-toast]").getByText(/was created/)).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.locator("button:has(.lucide-chevrons-up-down)")).toContainText(
        workflowName
      );
    });

    await test.step("delete removes the workflow again", async () => {
      await page.getByRole("button", { name: "More workflow actions" }).click();
      await page.getByRole("menuitem", { name: "Delete" }).click();

      const popup = page.getByRole("dialog");
      await expect(popup.getByRole("heading", { name: `Delete ${workflowName}?` })).toBeVisible();
      await popup.getByRole("button", { name: "Delete", exact: true }).click();

      await expect(page.locator("[data-sonner-toast]").getByText(/was deleted/)).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.locator("button:has(.lucide-chevrons-up-down)")).not.toContainText(
        workflowName
      );
    });
  });
});
