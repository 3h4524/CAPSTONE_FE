import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { showToast } from "@/helpers/toast";
import { useSubscriptionOverview } from "@/hooks/queries/use-subscription-overview";
import { buildSubscriptionOverview } from "@/test/factories";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { waitFor } from "@testing-library/react";

vi.mock("@/helpers/toast");

const OVERVIEW_URL = new URL(
  "/api/subscriptions/overview",
  process.env.NEXT_PUBLIC_API_BASE_URL
).toString();

const createOverviewResponder = () =>
  vi.fn(() => HttpResponse.json(buildSubscriptionOverview()));

describe("useSubscriptionOverview", () => {
  let overviewRequest: ReturnType<typeof createOverviewResponder>;

  beforeEach(() => {
    overviewRequest = createOverviewResponder();
    server.use(http.get(OVERVIEW_URL, overviewRequest));
  });

  it("moves from loading to success and returns the overview", async () => {
    const { result } = renderQueryHook(() => useSubscriptionOverview());

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({
      hasActivePaidPlan: true,
      currentSubscription: { planId: "plan-starter" },
    });
  });

  it("calls the endpoint exactly once because the wrapper disables retries", async () => {
    const { result } = renderQueryHook(() => useSubscriptionOverview());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(overviewRequest).toHaveBeenCalledTimes(1);
  });

  it("reports an account without a paid plan", async () => {
    server.use(
      http.get(OVERVIEW_URL, () =>
        HttpResponse.json(buildSubscriptionOverview({ hasActivePaidPlan: false }))
      )
    );

    const { result } = renderQueryHook(() => useSubscriptionOverview());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.hasActivePaidPlan).toBe(false);
  });

  it("raises the copy-pasted failure toast instead of the raw server message", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Boom" }, { status: 500 })
    );
    server.use(http.get(OVERVIEW_URL, failingRequest));

    const { result } = renderQueryHook(() => useSubscriptionOverview());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(showToast).toHaveBeenCalledWith(
      "error",
      "Failed to load data. Please try again.",
      undefined
    );
    expect(showToast).not.toHaveBeenCalledWith("error", "Boom", undefined);
    expect(failingRequest).toHaveBeenCalledTimes(1);
  });
});
