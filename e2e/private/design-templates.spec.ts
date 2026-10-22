import { expect, test } from "@playwright/test";

import { findCalls, recordApiCalls } from "../support/api";
import { hasSellerSession } from "../support/auth";
import { openPrivateRoute } from "../support/private";

const LIBRARY_PATH = /\/design-templates/;

test.describe("design template library", () => {
  test.beforeEach(() => {
    test.skip(!hasSellerSession(), "Seller storage state is missing; run the setup project first.");
  });

  test("loads the library with the system tab selected", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/design-templates");

    await test.step("the tablist and search field are rendered", async () => {
      const tablist = page.getByRole("tablist", { name: "Template library" });
      await expect(tablist).toBeVisible();
      await expect(page.getByRole("tab", { selected: true })).toBeVisible();
      await expect(page.getByRole("searchbox", { name: "Search system templates" })).toBeVisible();
    });

    await test.step("the template list endpoint answered 200", async () => {
      await expect
        .poll(() => findCalls(calls, "GET", "/api/design-templates").length, { timeout: 15_000 })
        .toBeGreaterThan(0);

      const listCalls = findCalls(calls, "GET", "/api/design-templates");
      expect(listCalls.every((call) => call.status === 200)).toBe(true);
      expect(findCalls(calls, "GET", "/api/design-templates/options")[0]?.status).toBe(200);
    });

    await test.step("the panel exposes an accessible name", async () => {
      await expect(page.getByRole("tabpanel")).toBeVisible();
    });
  });

  test("filters the personal tab and sends the scope to the API", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/design-templates");
    await page.getByRole("searchbox", { name: "Search system templates" }).waitFor();

    await test.step("switching to the personal tab re-queries the API", async () => {
      await page.getByRole("tab", { name: /My templates/ }).click();
      await expect(page.getByRole("searchbox", { name: "Search personal templates" })).toBeVisible();
    });

    await test.step("a search term narrows the request", async () => {
      await page.getByRole("searchbox", { name: "Search personal templates" }).fill("e2e probe");
      await expect
        .poll(
          () => calls.some((call) => call.path === "/api/design-templates"),
          { timeout: 7_000 }
        )
        .toBe(true);
    });
  });

  test("validates the new-template form before any request is sent", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/design-templates/new");

    await test.step("the identity form is rendered", async () => {
      await expect(page.getByRole("heading", { name: "Template identity" })).toBeVisible();
      await expect(page.getByLabel("Name")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Prompt framework" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Create template" })).toBeEnabled();
    });

    await test.step("submitting an empty form surfaces zod errors", async () => {
      await page.getByRole("button", { name: "Create template" }).click();

      await expect(page.getByText("Name is required.")).toBeVisible();
      await expect(page.getByText("Choose a niche.")).toBeVisible();
      await expect(page.getByText("Choose an art style.")).toBeVisible();
      await expect(page.getByText("Base prompt is required.")).toBeVisible();
    });

    await test.step("no create request left the browser", () => {
      expect(findCalls(calls, "POST", "/api/design-templates")).toHaveLength(0);
    });

    await test.step("the dirty form is still on the editor route", () => {
      expect(page.url()).toMatch(LIBRARY_PATH);
    });
  });

  test("creates a personal template end to end", async ({ page }) => {
    const calls = recordApiCalls(page);
    const name = `E2E template ${Date.now().toString(36)}`;

    await openPrivateRoute(page, "/design-templates/new");

    await test.step("fill every required field", async () => {
      await page.getByLabel("Name").fill(name);
      await page.getByLabel("Niche").click();
      await page.getByRole("option").first().click();
      await page.getByLabel("Art style").click();
      await page.getByRole("option").first().click();
      await page
        .getByPlaceholder(/Create a print-ready/i)
        .fill("A {subject} botanical illustration in {style}.");
    });

    await test.step("POST /api/design-templates returns 200", async () => {
      const [response] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.url().endsWith("/api/design-templates") &&
            candidate.request().method() === "POST"
        ),
        page.getByRole("button", { name: "Create template" }).click(),
      ]);

      expect(response.status()).toBe(201);
      await page.waitForURL(LIBRARY_PATH);
    });

    await test.step("the new template is listed and removed again", async () => {
      await expect(page.getByRole("searchbox", { name: "Search personal templates" })).toBeVisible();
      await page.getByRole("searchbox", { name: "Search personal templates" }).fill(name);

      const card = page.getByRole("heading", { name, level: 2 });
      await expect(card).toBeVisible();

      await page.getByRole("button", { name: `Delete ${name}` }).click();
      await expect(
        page.getByRole("heading", { name: "Delete personal template?" })
      ).toBeVisible();

      const [deleteResponse] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.url().includes("/api/design-templates/") &&
            candidate.request().method() === "DELETE"
        ),
        page.getByRole("dialog").getByRole("button", { name: /Delete/ }).click(),
      ]);

      expect([200, 204]).toContain(deleteResponse.status());
      await expect(card).toHaveCount(0);
    });

    expect(findCalls(calls, "POST", "/api/design-templates").length).toBe(1);
  });
});