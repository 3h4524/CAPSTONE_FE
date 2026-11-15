import { expect, request, test } from "@playwright/test";

import { AUTH_STATE_ABSOLUTE_PATH,E2E_API_BASE_URL , hasSellerSession  } from "../support/auth";
import { openPrivateRoute, pageHeading } from "../support/private";

const RAW_KEY_PATTERN = /\b[a-z]+\.[a-zA-Z]+\.[a-zA-Z.]+\b/;
const SEED_ASSET_FAILURE = /^Failed to load resource: net::ERR_NAME_NOT_RESOLVED @ https:\/\/cdn\.example\.com\//;

const switchLanguage = async (language: "en" | "vi") => {
  const api = await request.newContext({ baseURL: E2E_API_BASE_URL, storageState: AUTH_STATE_ABSOLUTE_PATH });
  try {
    const response = await api.patch("/api/profile", { data: { language } });
    if (!response.ok()) {
      throw new Error(`PATCH /api/profile failed with ${response.status()}: ${await response.text()}`);
    }
  } finally {
    await api.dispose();
  }
};

test.describe("i18n locale", () => {
  test.beforeEach(() => {
    test.skip(!hasSellerSession(), "Seller storage state is missing; run the setup project first.");
  });

  test("Vietnamese strings render on private pages and errors stay hidden", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        const location = message.location();
        consoleErrors.push(`${message.text()} @ ${location?.url ?? "<unknown>"}`);
      }
    });

    const heading = (name: string | RegExp) => pageHeading(page, name);

    try {
      await openPrivateRoute(page, "/styles");
      await expect(heading("My Styles")).toBeVisible();

      await switchLanguage("vi");

      const viRoutes: { path: string; title: string | RegExp }[] = [
        { path: "/styles", title: "Phong cách của tôi" },
        { path: "/usage", title: "Sử dụng" },
        { path: "/support", title: "Trung tâm hỗ trợ" },
        { path: "/api-keys", title: "API keys" },
        { path: "/mockups", title: "Mẫu mock-up" },
        { path: "/profile", title: "Hồ sơ" },
        { path: "/subscription", title: /Billing\s*&\s*Subscription/ },
        { path: "/market-opportunities", title: "Radar cơ hội thị trường" },
      ];

      for (const route of viRoutes) {
        await test.step(`${route.path} renders the Vietnamese heading`, async () => {
          await openPrivateRoute(page, route.path);
          await expect(heading(route.title)).toBeVisible();
          const mainText = await page.getByRole("main").innerText();
          expect(mainText, `raw i18n key visible on ${route.path}`).not.toMatch(RAW_KEY_PATTERN);
        });
      }

      const relevantErrors = consoleErrors.filter((entry) => !SEED_ASSET_FAILURE.test(entry));
      expect(relevantErrors, "console errors while sweeping the Vietnamese pages").toEqual([]);
    } finally {
      await switchLanguage("en");
    }
  });

  test("English strings render after switching back to English", async ({ page }) => {
    try {
      await switchLanguage("en");
      await openPrivateRoute(page, "/styles");
      await expect(pageHeading(page, "My Styles")).toBeVisible();
    } finally {
      await switchLanguage("en");
    }
  });
});
