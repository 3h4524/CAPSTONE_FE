import { existsSync } from "node:fs";
import path from "node:path";

export const AUTH_STATE_PATH = "playwright/.auth/seller.json";
export const AUTH_READY_PATH = "playwright/.auth/seller.ready";
export const AUTH_STATE_ABSOLUTE_PATH = path.resolve(AUTH_STATE_PATH);
export const AUTH_READY_ABSOLUTE_PATH = path.resolve(AUTH_READY_PATH);

export const E2E_API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:5191";

export const SELLER_CREDENTIALS_MISSING_MESSAGE =
  "Seller credentials not configured. Set E2E_SELLER_EMAIL and E2E_SELLER_PASSWORD to run authenticated E2E (run CAPSTONE_BE scripts/e2e/seed-seller.sh first).";

type SellerCredentials = {
  email: string;
  password: string;
};

export const readSellerCredentials = (): SellerCredentials | null => {
  const email = process.env.E2E_SELLER_EMAIL;
  const password = process.env.E2E_SELLER_PASSWORD;

  if (!email || !password) {
    return null;
  }

  return { email, password };
};

/**
 * The storage state file always exists after the setup project runs, because `storageState` in
 * playwright.config.ts is resolved unconditionally and a missing file aborts context creation
 * instead of skipping the spec. This marker is written only after a real login succeeds, so it is
 * the signal that the authenticated project may actually exercise private routes.
 */
export const hasSellerSession = (): boolean => existsSync(AUTH_READY_ABSOLUTE_PATH);