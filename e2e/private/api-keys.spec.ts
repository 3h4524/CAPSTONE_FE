import { expect, test } from "@playwright/test";

import { findCalls, recordApiCalls } from "../support/api";
import { hasSellerSession } from "../support/auth";
import { openPrivateRoute, pageHeading } from "../support/private";

test.describe("api keys", () => {
  test.beforeEach(() => {
    test.skip(!hasSellerSession(), "Seller storage state is missing; run the setup project first.");
  });

  test("loads the connection overview from the API", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/api-keys");

    await test.step("GET /api/auth/me and GET /api/api-keys answered 200", async () => {
      await expect(pageHeading(page, "API keys")).toBeVisible();

      await expect
        .poll(() => findCalls(calls, "GET", "/api/api-keys")[0]?.status, { timeout: 15_000 })
        .toBe(200);
      expect(findCalls(calls, "GET", "/api/auth/me")[0]?.status).toBe(200);
    });

    await test.step("the summary section is rendered", async () => {
      const summary = page.getByRole("region", { name: "Connection summary" });
      await expect(summary).toBeVisible();
      await expect(summary.getByText("Connected", { exact: true })).toBeVisible();
      await expect(summary.getByText("Needs attention", { exact: true })).toBeVisible();
    });

    await test.step("the privacy notice explains masked credentials", async () => {
      await expect(page.getByText("Keys stay private.")).toBeVisible();
    });
  });

  test("offers the add-key dialog with providers loaded from the API", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/api-keys");
    await expect(pageHeading(page, "API keys")).toBeVisible();

    await test.step("opening the dialog requests the provider list", async () => {
      const [response] = await Promise.all([
        page.waitForResponse((candidate) => candidate.url().endsWith("/api/api-keys/providers")),
        page.getByRole("button", { name: "Add API key" }).first().click(),
      ]);

      expect(response.status()).toBe(200);
      expect(findCalls(calls, "GET", "/api/api-keys/providers").length).toBeGreaterThan(0);
    });

    await test.step("submit stays disabled until a provider is chosen", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Add API key" })).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Validate & save" })
      ).toBeDisabled();
    });

    await test.step("choosing a provider still needs a key and the confirmation box", async () => {
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Provider").click();
      await page.getByRole("option", { name: "OpenAI", exact: true }).click();

      await expect(dialog.getByLabel("API key", { exact: true })).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Validate & save" })).toBeDisabled();
      await expect(dialog.getByText(/I confirm this key is restricted/)).toBeVisible();
    });
  });

  test("surfaces the backend error when a key cannot be validated", async ({ page }) => {
    await openPrivateRoute(page, "/api-keys");
    await expect(pageHeading(page, "API keys")).toBeVisible();

    const dialog = page.getByRole("dialog");
    await page.getByRole("button", { name: "Add API key" }).first().click();
    await dialog.getByLabel("Provider").click();
    await page.getByRole("option", { name: "OpenAI", exact: true }).click();
    await dialog.getByLabel("API key", { exact: true }).fill("sk-e2e-invalid-key-value");
    await dialog.getByRole("checkbox").check();

    await test.step("POST /api/api-keys is rejected with a readable message", async () => {
      const [response] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.url().endsWith("/api/api-keys") &&
            candidate.request().method() === "POST"
        ),
        dialog.getByRole("button", { name: "Validate & save" }).click(),
      ]);

      expect(response.status()).toBe(400);
      await expect(dialog.getByRole("alert")).toContainText(/validate/i);
    });
  });

  test("opens the setup guide dialog", async ({ page }) => {
    await openPrivateRoute(page, "/api-keys");
    await expect(pageHeading(page, "API keys")).toBeVisible();

    await page.getByRole("button", { name: /Read setup guide/ }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Prepare your service connections" })
    ).toBeVisible();
    await expect(dialog.getByRole("listitem").first()).toBeVisible();
  });

  test("refetches the key list on the 60 second interval under a fake clock", async ({ page }) => {
    const calls = recordApiCalls(page);

    await page.clock.install({ time: new Date("2026-03-01T09:00:00Z") });
    await openPrivateRoute(page, "/api-keys");
    await expect(pageHeading(page, "API keys")).toBeVisible();

    await expect
      .poll(() => findCalls(calls, "GET", "/api/api-keys").length, { timeout: 15_000 })
      .toBe(1);
    const initial = 1;

    await test.step("no refetch happens before the interval elapses", async () => {
      await page.clock.fastForward("00:00:30");
      await page.waitForTimeout(500);
      expect(findCalls(calls, "GET", "/api/api-keys").length).toBe(initial);
    });

    await test.step("crossing the interval triggers one more list request", async () => {
      await page.clock.fastForward("00:00:35");
      await expect
        .poll(() => findCalls(calls, "GET", "/api/api-keys").length, { timeout: 10_000 })
        .toBe(initial + 1);
    });
  });
});