import { request, test as setup } from "@playwright/test";

import {
  AUTH_STATE_PATH,
  E2E_API_BASE_URL,
  readSellerCredentials,
  SELLER_CREDENTIALS_MISSING_MESSAGE,
} from "./support/auth";

type LoginResponse = {
  user?: { id: string; email: string; fullName: string; roles: string[] };
  requiresTwoFactor?: boolean;
};

setup("authenticate seller", async () => {
  const credentials = readSellerCredentials();

  setup.skip(
    !credentials,
    SELLER_CREDENTIALS_MISSING_MESSAGE
  );

  const api = await request.newContext({ baseURL: E2E_API_BASE_URL });
  const response = await api.post("/api/auth/login", {
    data: { email: credentials?.email, password: credentials?.password },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Seller login failed with ${response.status()}: ${body}`);
  }

  const result = (await response.json()) as LoginResponse;

  setup.skip(
    !!result.requiresTwoFactor,
    "Seeded seller account requires 2FA; a non-admin account is needed for authenticated E2E."
  );

  if (!result.user) {
    throw new Error("Seller login returned no user payload");
  }

  await api.storageState({ path: AUTH_STATE_PATH });
  await api.dispose();
});