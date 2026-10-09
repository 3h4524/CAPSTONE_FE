import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { request, test as setup } from "@playwright/test";

import {
  AUTH_READY_PATH,
  AUTH_STATE_ABSOLUTE_PATH,
  AUTH_STATE_PATH,
  E2E_API_BASE_URL,
  readSellerCredentials,
  SELLER_CREDENTIALS_MISSING_MESSAGE,
} from "./support/auth";

type LoginResponse = {
  user?: { id: string; email: string; fullName: string; roles: string[] };
  requiresTwoFactor?: boolean;
};

const AUTH_DIR = path.dirname(AUTH_STATE_ABSOLUTE_PATH);

const writeEmptyStorageState = () => {
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(AUTH_STATE_ABSOLUTE_PATH, JSON.stringify({ cookies: [], origins: [] }));
};

const clearSellerSession = () => {
  rmSync(AUTH_STATE_ABSOLUTE_PATH, { force: true });
  rmSync(path.resolve(AUTH_READY_PATH), { force: true });
};

setup("authenticate seller", async () => {
  mkdirSync(AUTH_DIR, { recursive: true });
  clearSellerSession();

  const credentials = readSellerCredentials();

  if (!credentials) {
    writeEmptyStorageState();
    setup.skip(true, SELLER_CREDENTIALS_MISSING_MESSAGE);
    return;
  }

  const api = await request.newContext({ baseURL: E2E_API_BASE_URL });
  const response = await api.post("/api/auth/login", {
    data: { email: credentials.email, password: credentials.password },
  });

  if (!response.ok()) {
    await api.dispose();
    throw new Error(`Seller login failed with ${response.status()}: ${await response.text()}`);
  }

  const result = (await response.json()) as LoginResponse;

  if (result.requiresTwoFactor) {
    await api.dispose();
    writeEmptyStorageState();
    setup.skip(
      true,
      "Seeded seller account requires 2FA; a non-admin account is needed for authenticated E2E."
    );
    return;
  }

  if (!result.user) {
    await api.dispose();
    throw new Error("Seller login returned no user payload");
  }

  await api.storageState({ path: AUTH_STATE_PATH });
  await api.dispose();

  const cookies = (
    JSON.parse(readFileSync(AUTH_STATE_ABSOLUTE_PATH, "utf8")) as {
      cookies: Array<{ name: string; httpOnly: boolean }>;
    }
  ).cookies;

  const sessionCookies = cookies.filter((cookie) => cookie.name.startsWith("__Host-apcs_"));

  if (sessionCookies.length === 0 || sessionCookies.some((cookie) => !cookie.httpOnly)) {
    throw new Error(
      "The captured storage state has no HttpOnly __Host-apcs_ session cookie, so private-route E2E would not be testing the real auth contract."
    );
  }

  writeFileSync(path.resolve(AUTH_READY_PATH), `${result.user.roles.join(",")}\n`);
});