import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";

import { listApiKeys } from "@/api/api-keys";
import { loginRequest, meRequest } from "@/api/auth";
import { api } from "@/api/client";
import { listDesignTemplates } from "@/api/design-templates";
import { getSubscriptionOverviewRequest } from "@/api/subscription";
import { listSupportTickets } from "@/api/support-tickets";
import { useAuthStore } from "@/stores/auth";
import { buildAuthenticatedUser, buildSessionUser } from "@/test/factories";
import { server } from "@/test/mocks/server";

const ME_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/me`;
const REFRESH_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/refresh`;

const initialAuthState = useAuthStore.getState();

describe("http client + msw", () => {
  afterEach(() => {
    useAuthStore.setState(initialAuthState, true);
  });

  it("intercepts the auth endpoints through absolute-URL handlers", async () => {
    const login = await loginRequest({ email: "seller@apcs.test", password: "Valid1234" });

    expect(login.user?.email).toBe("seller@apcs.test");
    await expect(meRequest()).resolves.toMatchObject({ id: "user-1" });
  });

  it("intercepts the paged list endpoints", async () => {
    await expect(listApiKeys()).resolves.toMatchObject({ connectedCount: 1 });

    await expect(
      listDesignTemplates({ pageNumber: 1, pageSize: 20, scope: "system" })
    ).resolves.toMatchObject({ totalCount: 1 });

    await expect(listSupportTickets({ pageNumber: 1, pageSize: 20 })).resolves.toMatchObject({
      totalCount: 1,
    });

    await expect(getSubscriptionOverviewRequest()).resolves.toMatchObject({
      hasActivePaidPlan: false,
    });
  });

  it("rejects a request no handler matches", async () => {
    await expect(api.get("/api/never-registered")).rejects.toThrow();
  });

  it("refreshes the cookie and retries once after a 401", async () => {
    let attempts = 0;
    server.use(
      http.get(ME_URL, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ message: "expired" }, { status: 401 })
          : HttpResponse.json(buildSessionUser());
      })
    );

    await expect(meRequest()).resolves.toMatchObject({ id: "user-1" });
    expect(attempts).toBe(2);
  });

  it("clears the session when the refresh itself fails", async () => {
    useAuthStore.getState().setUser(buildAuthenticatedUser());
    server.use(
      http.get(ME_URL, () => HttpResponse.json({ message: "expired" }, { status: 401 })),
      http.post(REFRESH_URL, () => HttpResponse.json({ message: "gone" }, { status: 401 }))
    );

    await expect(meRequest()).rejects.toThrow();
    expect(useAuthStore.getState().user).toBeNull();
  });
});