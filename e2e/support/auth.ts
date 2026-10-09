import { existsSync } from "node:fs";
import path from "node:path";

export const AUTH_STATE_PATH = "playwright/.auth/seller.json";
export const AUTH_STATE_ABSOLUTE_PATH = path.resolve(AUTH_STATE_PATH);

export const E2E_API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:5191";

export const SELLER_CREDENTIALS_MISSING_MESSAGE =
  "Seller credentials not configured. Set E2E_SELLER_EMAIL and E2E_SELLER_PASSWORD to run authenticated E2E (a seeded Seller account is being prepared on the backend).";

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

export const hasSellerSession = (): boolean => existsSync(AUTH_STATE_ABSOLUTE_PATH);