import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBatches } from "@/hooks/queries/use-batches";
import { buildBatch } from "@/test/factories";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { waitFor } from "@testing-library/react";

const BATCHES_URL = new URL("/api/batches", process.env.NEXT_PUBLIC_API_BASE_URL).toString();

const createBatchesResponder = () => vi.fn(() => HttpResponse.json([buildBatch()]));

describe("useBatches", () => {
  let listRequest: ReturnType<typeof createBatchesResponder>;

  beforeEach(() => {
    listRequest = createBatchesResponder();
    server.use(http.get(BATCHES_URL, listRequest));
  });

  it("moves from loading to success and returns the batch list", async () => {
    const { result } = renderQueryHook(() => useBatches());

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([buildBatch()]);
    expect(result.current.isError).toBe(false);
  });

  it("calls the endpoint exactly once because the wrapper disables retries", async () => {
    const { result } = renderQueryHook(() => useBatches());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(listRequest).toHaveBeenCalledTimes(1);
  });

  it("surfaces a server error without retrying", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Boom" }, { status: 500 })
    );
    server.use(http.get(BATCHES_URL, failingRequest));

    const { result } = renderQueryHook(() => useBatches());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
    expect(failingRequest).toHaveBeenCalledTimes(1);
  });

  it("returns an empty list when the account has no batch", async () => {
    const emptyRequest = vi.fn(() => HttpResponse.json([]));
    server.use(http.get(BATCHES_URL, emptyRequest));

    const { result } = renderQueryHook(() => useBatches());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
    expect(emptyRequest).toHaveBeenCalledTimes(1);
  });
});
