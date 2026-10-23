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

  it("shares a single refresh across concurrent 401s", async () => {
    let meAttempts = 0;
    let refreshCalls = 0;
    server.use(
      http.get(ME_URL, () => {
        meAttempts += 1;
        return meAttempts <= 2
          ? HttpResponse.json({ message: "expired" }, { status: 401 })
          : HttpResponse.json(buildSessionUser());
      }),
      http.post(REFRESH_URL, async () => {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return new HttpResponse(null, { status: 204 });
      })
    );

    const [firstUser, secondUser] = await Promise.all([meRequest(), meRequest()]);

    expect(firstUser).toMatchObject({ id: "user-1" });
    expect(secondUser).toMatchObject({ id: "user-1" });
    expect(refreshCalls).toBe(1);
    expect(meAttempts).toBe(4);
  });

  it("retries only once when the retried request also returns 401", async () => {
    let meAttempts = 0;
    let refreshCalls = 0;
    server.use(
      http.get(ME_URL, () => {
        meAttempts += 1;
        return HttpResponse.json({ message: "expired" }, { status: 401 });
      }),
      http.post(REFRESH_URL, () => {
        refreshCalls += 1;
        return new HttpResponse(null, { status: 204 });
      })
    );

    await expect(meRequest()).rejects.toThrow();
    expect(meAttempts).toBe(2);
    expect(refreshCalls).toBe(1);
  });

  it("does not refresh on a 500 error", async () => {
    let meAttempts = 0;
    let refreshCalls = 0;
    server.use(
      http.get(ME_URL, () => {
        meAttempts += 1;
        return HttpResponse.json({ message: "boom" }, { status: 500 });
      }),
      http.post(REFRESH_URL, () => {
        refreshCalls += 1;
        return new HttpResponse(null, { status: 204 });
      })
    );

    await expect(meRequest()).rejects.toThrow();
    expect(meAttempts).toBe(1);
    expect(refreshCalls).toBe(0);
  });

  it("does not refresh on a 403 error", async () => {
    let meAttempts = 0;
    let refreshCalls = 0;
    server.use(
      http.get(ME_URL, () => {
        meAttempts += 1;
        return HttpResponse.json({ message: "forbidden" }, { status: 403 });
      }),
      http.post(REFRESH_URL, () => {
        refreshCalls += 1;
        return new HttpResponse(null, { status: 204 });
      })
    );

    await expect(meRequest()).rejects.toThrow();
    expect(meAttempts).toBe(1);
    expect(refreshCalls).toBe(0);
  });

  it("does not refresh on a 404 error", async () => {
    let meAttempts = 0;
    let refreshCalls = 0;
    server.use(
      http.get(ME_URL, () => {
        meAttempts += 1;
        return HttpResponse.json({ message: "missing" }, { status: 404 });
      }),
      http.post(REFRESH_URL, () => {
        refreshCalls += 1;
        return new HttpResponse(null, { status: 204 });
      })
    );

    await expect(meRequest()).rejects.toThrow();
    expect(meAttempts).toBe(1);
    expect(refreshCalls).toBe(0);
  });

  it("rejects network failures without refreshing or clearing the session", async () => {
    useAuthStore.getState().setUser(buildAuthenticatedUser());
    let refreshCalls = 0;
    server.use(
      http.get(ME_URL, () => HttpResponse.error()),
      http.post(REFRESH_URL, () => {
        refreshCalls += 1;
        return new HttpResponse(null, { status: 204 });
      })
    );

    await expect(meRequest()).rejects.toThrow();
    expect(refreshCalls).toBe(0);
    expect(useAuthStore.getState().user).not.toBeNull();
  });
});