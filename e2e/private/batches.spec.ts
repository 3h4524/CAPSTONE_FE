import path from "node:path";

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { apiPath, findCalls, recordApiCalls } from "../support/api";
import { hasSellerSession } from "../support/auth";
import { openPrivateRoute, pageHeading, uniqueLabel } from "../support/private";

const FIXTURE_XLSX = path.resolve(__dirname, "../fixtures/product-import.xlsx");

/**
 * Opens the card menu of a batch and picks "Delete batch". The list polls, so the open menu keeps
 * re-rendering and the item is never "stable" long enough for a normal click, and it can open
 * outside the viewport; the keyboard activates the item either way.
 */
const deleteBatchFromCard = async (page: Page, batchName: string) => {
  const cardHeading = page.getByRole("heading", { name: batchName, level: 3 });
  await cardHeading.evaluate((element) => element.scrollIntoView({ block: "center" }));

  const cardMenu = cardHeading.locator("xpath=ancestor::button").locator("xpath=..");
  await cardMenu.getByRole("button").last().click();

  const deleteBatchItem = page.getByRole("menuitem", { name: "Delete batch" });
  await expect(deleteBatchItem).toBeVisible();
  await deleteBatchItem.focus();
  await page.keyboard.press("Enter");
};

test.describe("product batches", () => {
  test.beforeEach(() => {
    test.skip(!hasSellerSession(), "Seller storage state is missing; run the setup project first.");
  });

  test("creates a batch and lists it from the API", async ({ page }) => {
    const calls = recordApiCalls(page);
    const batchName = uniqueLabel("E2E batch");

    await openPrivateRoute(page, "/batches");
    await expect(pageHeading(page, "Product batches")).toBeVisible();

    await test.step("GET /api/batches answered 200", async () => {
      await expect
        .poll(() => findCalls(calls, "GET", "/api/batches")[0]?.status, { timeout: 15_000 })
        .toBe(200);
    });

    await test.step("POST /api/batches creates the batch", async () => {
      await page.getByRole("button", { name: "New batch" }).click();

      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", { name: "Create product batch" })
      ).toBeVisible();
      await dialog.getByLabel("Batch name *").fill(batchName);
      await dialog.getByLabel("Default niche").fill("hiking and camping");

      const [response] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.url().endsWith("/api/batches") &&
            candidate.request().method() === "POST"
        ),
        dialog.getByRole("button", { name: "Create batch" }).click(),
      ]);

      expect(response.status()).toBe(200);
    });

    await test.step("the batch appears in the list and its products are fetched", async () => {
      await expect(page.getByRole("heading", { name: batchName, level: 3 })).toBeVisible();
      // Scoped to the new batch: the list holds the batches of every earlier run as well.
      await expect(
        page
          .getByRole("heading", { name: batchName, level: 3 })
          .locator("xpath=ancestor::button")
          .locator("xpath=..")
          .getByText("Default niche")
      ).toBeVisible();
      await expect
        .poll(
          () => calls.some((call) => /^\/api\/batches\/[0-9a-f-]+\/products$/.test(call.path)),
          { timeout: 10_000 }
        )
        .toBe(true);
    });

    await test.step("deleting the batch removes it again", async () => {
      await deleteBatchFromCard(page, batchName);

      const [response] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.url().includes("/api/batches/") &&
            candidate.request().method() === "DELETE"
        ),
        page.getByRole("dialog").getByRole("button", { name: "Delete batch" }).click(),
      ]);

      expect(response.status()).toBe(204);
      await expect(page.getByRole("heading", { name: batchName, level: 3 })).toHaveCount(0);
    });
  });

  test("requires a batch name", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/batches");
    await page.getByRole("button", { name: "New batch" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Create batch" }).click();

    await test.step("zod reports the missing name inside the form", async () => {
      const form = dialog
        .getByRole("button", { name: "Create batch" })
        .locator("xpath=ancestor::form");
      await expect(form.getByText(/name/i).first()).toBeVisible();
    });

    expect(findCalls(calls, "POST", "/api/batches")).toHaveLength(0);
  });

  test("imports products from a real .xlsx fixture", async ({ page }) => {
    const calls = recordApiCalls(page);
    const batchName = uniqueLabel("E2E import");

    await openPrivateRoute(page, "/batches");
    await page.getByRole("button", { name: "New batch" }).click();

    const createDialog = page.getByRole("dialog");
    await createDialog.getByLabel("Batch name *").fill(batchName);
    await createDialog.getByRole("button", { name: "Create batch" }).click();
    await expect(page.getByRole("heading", { name: batchName, level: 3 })).toBeVisible();

    await test.step("opening the importer issues no request yet", () => {
      expect(findCalls(calls, "POST", /\/products\/import$/)).toHaveLength(0);
    });

    await test.step("uploading the fixture parses both rows in the browser", async () => {
      await page.getByRole("button", { name: "Import Excel" }).click();

      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", { name: "Import products from Excel" })
      ).toBeVisible();

      await dialog.getByLabel("Excel file (.xlsx)").setInputFiles(FIXTURE_XLSX);

      await expect(dialog.getByText("2 rows ready")).toBeVisible();
      await expect(dialog.getByText("0 need attention")).toBeVisible();
    });

    await test.step("importing posts the parsed rows and stores them as pending", async () => {
      const dialog = page.getByRole("dialog");
      const [response] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.url().includes("/products/import") &&
            candidate.request().method() === "POST"
        ),
        dialog.getByRole("button", { name: "Import valid rows" }).click(),
      ]);

      expect(response.status()).toBe(200);
      expect(await response.json()).toMatchObject({ importedCount: 2, errors: [] });
    });

    await test.step("both fixture products are listed for the batch", async () => {
      await expect(page.getByText("E2E Trail Tee")).toBeVisible();
      await expect(page.getByText("E2E Sunset Mug")).toBeVisible();
      const productsTable = page.getByRole("table");
      await expect(productsTable.getByText("T-shirt", { exact: true })).toBeVisible();
      await expect(productsTable.getByText("Mug", { exact: true })).toBeVisible();
    });

    await test.step("the products endpoint agrees with the UI", async () => {
      const productsPath = calls.find((call) => /\/products$/.test(call.path))?.path;
      expect(productsPath).toBeTruthy();

      const response = await page.request.get(apiPath(productsPath as string));
      expect(response.ok()).toBe(true);
      expect(await response.json()).toHaveLength(2);
    });

    await test.step("cleanup removes the imported batch", async () => {
      const cardMenu = page
        .getByRole("heading", { name: batchName, level: 3 })
        .locator("xpath=ancestor::button")
        .locator("xpath=..");

      await cardMenu.getByRole("button").last().click();
      // The list polls, so the open menu keeps re-rendering and the item is never "stable"
      // long enough for a normal click.
      const deleteBatchItem = page.getByRole("menuitem", { name: "Delete batch" });
      await expect(deleteBatchItem).toBeVisible();
      await deleteBatchItem.click({ force: true });

      const [response] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.url().includes("/api/batches/") &&
            candidate.request().method() === "DELETE"
        ),
        page.getByRole("dialog").getByRole("button", { name: "Delete batch" }).click(),
      ]);

      expect(response.status()).toBe(204);
    });
  });

  test("rejects a non-xlsx upload before any request", async ({ page }) => {
    const calls = recordApiCalls(page);
    const batchName = uniqueLabel("E2E badfile");

    await openPrivateRoute(page, "/batches");
    await page.getByRole("button", { name: "New batch" }).click();

    const createDialog = page.getByRole("dialog");
    await createDialog.getByLabel("Batch name *").fill(batchName);
    await createDialog.getByRole("button", { name: "Create batch" }).click();
    await expect(page.getByRole("heading", { name: batchName, level: 3 })).toBeVisible();

    await page.getByRole("button", { name: "Import Excel" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Excel file (.xlsx)").setInputFiles({
      name: "products.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("name,type,niche,keywords\n"),
    });

    await test.step("the client-side error is shown", async () => {
      await expect(dialog.getByRole("alert")).toHaveText("Choose an Excel .xlsx file.");
      await expect(
        dialog.getByRole("button", { name: "Import valid rows" })
      ).toBeDisabled();
    });

    expect(findCalls(calls, "POST", /\/products\/import$/)).toHaveLength(0);

    await dialog.getByRole("button", { name: "Close" }).last().click();

    await deleteBatchFromCard(page, batchName);
    await page.getByRole("dialog").getByRole("button", { name: "Delete batch" }).click();
    await expect(page.getByRole("heading", { name: batchName, level: 3 })).toHaveCount(0);
  });
});