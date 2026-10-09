import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { readSellerCredentials } from "./auth";

export const SELLER_CREDENTIALS_MISSING_MESSAGE =
  "Seeded seller credentials are not configured.";

export const requireSellerCredentials = () => {
  const credentials = readSellerCredentials();

  if (!credentials) {
    throw new Error(
      "The authenticated project needs E2E_SELLER_EMAIL and E2E_SELLER_PASSWORD."
    );
  }

  return credentials;
};

export const openPrivateRoute = async (page: Page, path: string) => {
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
};

export const waitForSessionCookie = async (page: Page) => {
  await expect
    .poll(async () => {
      const cookies = await page.context().cookies();
      return cookies.some((cookie) => cookie.name === "__Host-apcs_access");
    })
    .toBe(true);
};

export const uniqueLabel = (prefix: string) =>
  `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** The app header repeats the route name as its own `h1`, so page headings must be scoped. */
export const pageHeading = (page: Page, name: string | RegExp) =>
  page.getByRole("main").getByRole("heading", { level: 1, name });