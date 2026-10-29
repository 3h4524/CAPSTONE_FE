import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useApiKeys } from "@/hooks/queries/use-api-keys";
import { buildApiKeyOverview } from "@/test/factories";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { waitFor } from "@testing-library/react";

const API_KEYS_URL = new URL("/api/api-keys", process.env.NEXT_PUBLIC_API_BASE_URL).toString();

const createApiKeysResponder = () => vi.fn(() => HttpResponse.json(buildApiKeyOverview()));

describe("useApiKeys", () => {
  let listRequest: ReturnType<typeof createApiKeysResponder>;

  beforeEach(() => {
    listRequest = createApiKeysResponder();
    server.use(http.get(API_KEYS_URL, listRequest));
  });

  it("moves from loading to success and returns the overview", async () => {
    const { result } = renderQueryHook(() => useApiKeys("user-1"));

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({ connectedCount: 1, isReady: true });
  });

  it("skips the request until a user id is known", () => {
    const { result } = renderQueryHook(() => useApiKeys());

    expect(result.current.fetchStatus).toBe("idle");
    expect(listRequest).not.toHaveBeenCalled();
  });

  it("requests the keys as soon as the user id arrives", async () => {
    const { result, rerender } = renderQueryHook(
      (userId?: string) => useApiKeys(userId),
      { initialProps: undefined }
    );

    expect(listRequest).not.toHaveBeenCalled();

    rerender("user-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listRequest).toHaveBeenCalledTimes(1);
  });

  it("calls the endpoint exactly once", async () => {
    const { result } = renderQueryHook(() => useApiKeys("user-1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(listRequest).toHaveBeenCalledTimes(1);
  });

  it("surfaces a server error without retrying", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Boom" }, { status: 500 })
    );
    server.use(http.get(API_KEYS_URL, failingRequest));

    const { result } = renderQueryHook(() => useApiKeys("user-1"));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
    expect(failingRequest).toHaveBeenCalledTimes(1);
  });

  it("reports a connection that needs attention", async () => {
    server.use(
      http.get(
        API_KEYS_URL,
        () =>
          HttpResponse.json(
            buildApiKeyOverview({ items: [], needsAttentionCount: 0, isReady: true })
          )
      )
    );

    const { result } = renderQueryHook(() => useApiKeys("user-1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({ items: [], isReady: true });
  });
});
