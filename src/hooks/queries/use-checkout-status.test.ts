import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCheckoutStatus } from "@/hooks/queries/use-checkout-status";
import { buildCheckoutStatus } from "@/test/factories";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { act } from "@testing-library/react";

const STATUS_URL = new URL(
  "/api/subscriptions/checkout/:invoiceId/status",
  process.env.NEXT_PUBLIC_API_BASE_URL
).toString();

const POLL_INTERVAL_MS = 3000;

const createStatusResponder = () =>
  vi.fn(({ params }: { params: { invoiceId?: string } }) =>
    HttpResponse.json(
      buildCheckoutStatus({ invoiceNumber: String(params.invoiceId ?? "invoice") })
    )
  );

describe("useCheckoutStatus", () => {
  let statusRequest: ReturnType<typeof createStatusResponder>;

  beforeEach(() => {
    statusRequest = createStatusResponder();
    server.use(http.get(STATUS_URL, statusRequest));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("moves from loading to success and returns the checkout status", async () => {
    const { result } = renderQueryHook(() => useCheckoutStatus("invoice-1"));

    expect(result.current.isPending).toBe(true);

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({ status: "pending", invoiceNumber: "invoice-1" });
  });

  it("requests the status behind the invoice id in the url", async () => {
    const { result } = renderQueryHook(() => useCheckoutStatus("invoice-42"));

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.invoiceNumber).toBe("invoice-42");
  });

  it("skips the request while no invoice is known", () => {
    const { result } = renderQueryHook(() => useCheckoutStatus(null));

    expect(result.current.fetchStatus).toBe("idle");
    expect(statusRequest).not.toHaveBeenCalled();
  });

  it("calls the endpoint exactly once because the wrapper disables retries", async () => {
    const { result } = renderQueryHook(() => useCheckoutStatus("invoice-1"));

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(statusRequest).toHaveBeenCalledTimes(1);
  });

  it("polls again while the checkout is still pending", async () => {
    vi.useFakeTimers();

    const { result } = renderQueryHook(() => useCheckoutStatus("invoice-1"));

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(statusRequest).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });

    await vi.waitFor(() => expect(statusRequest).toHaveBeenCalledTimes(2));
  });

  it("stops polling once the checkout is paid", async () => {
    const paidRequest = vi.fn(() =>
      HttpResponse.json(buildCheckoutStatus({ status: "paid" }))
    );
    server.use(http.get(STATUS_URL, paidRequest));

    vi.useFakeTimers();

    const { result } = renderQueryHook(() => useCheckoutStatus("invoice-1"));

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe("paid");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 4);
    });

    expect(paidRequest).toHaveBeenCalledTimes(1);
  });

  it("surfaces a server error without retrying", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Boom" }, { status: 500 })
    );
    server.use(http.get(STATUS_URL, failingRequest));

    const { result } = renderQueryHook(() => useCheckoutStatus("invoice-1"));

    await vi.waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
    expect(failingRequest).toHaveBeenCalledTimes(1);
  });
});
