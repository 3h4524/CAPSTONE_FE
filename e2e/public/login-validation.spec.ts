import { expect, test } from "@playwright/test";

test.describe("login validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("empty submit surfaces both zod messages", async ({ page }) => {
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // Scoped to the form: Next's route announcer is also an empty `role="alert"` in the document.
    const alerts = page.locator("form").getByRole("alert");

    await expect(alerts).toHaveText(["Please enter a valid email address", "Password is required"]);
  });

  test("malformed email is blocked by native validation before any request", async ({ page }) => {
    let loginCalls = 0;
    await page.route("**/api/auth/login", (route) => {
      loginCalls += 1;
      return route.abort();
    });

    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("Passw0rd!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // `input[type=email]` fails constraint validation, so the browser never submits the form and
    // zod never runs: the field stays unflagged and no request leaves the page.
    await expect(page.getByLabel("Email")).toHaveJSProperty("validity.typeMismatch", true);
    await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
    expect(loginCalls).toBe(0);
  });

  test("invalid fields are marked for assistive tech", async ({ page }) => {
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Password")).toHaveAttribute("aria-invalid", "true");
  });

  
});