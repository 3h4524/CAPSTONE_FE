import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSupportTickets } from "@/hooks/queries/use-support-tickets";
import { buildPagedResult, buildSupportTicket } from "@/test/factories";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import type { TicketFilters } from "@/types/support";
import { waitFor } from "@testing-library/react";

const SUPPORT_URL = new URL("/api/support-tickets", process.env.NEXT_PUBLIC_API_BASE_URL).toString();

const FIRST_PAGE: TicketFilters = { pageNumber: 1, pageSize: 20 };
const SECOND_PAGE: TicketFilters = { pageNumber: 2, pageSize: 20 };

const createSupportResponder = () =>
  vi.fn(() =>
    HttpResponse.json(buildPagedResult([buildSupportTicket()], { pageSize: 20 }))
  );

describe("useSupportTickets", () => {
  let listRequest: ReturnType<typeof createSupportResponder>;

  beforeEach(() => {
    listRequest = createSupportResponder();
    server.use(http.get(SUPPORT_URL, listRequest));
  });

  it("moves from loading to success and returns the paged list", async () => {
    const { result } = renderQueryHook((filters: TicketFilters) => useSupportTickets(filters), {
      initialProps: FIRST_PAGE,
    });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({ totalCount: 1, pageSize: 20 });
  });

  it("skips the request while disabled", () => {
    const { result } = renderQueryHook(
      (filters: TicketFilters) => useSupportTickets(filters, false),
      { initialProps: FIRST_PAGE }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(listRequest).not.toHaveBeenCalled();
  });

  it("keeps the previous page on screen while the next filters load", async () => {
    const { result, rerender } = renderQueryHook(
      (filters: TicketFilters) => useSupportTickets(filters),
      { initialProps: FIRST_PAGE }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPlaceholderData).toBe(false);

    rerender(SECOND_PAGE);

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true));
    expect(result.current.data?.totalCount).toBe(1);
  });

  it("replaces the placeholder once the next page resolves", async () => {
    const { result, rerender } = renderQueryHook(
      (filters: TicketFilters) => useSupportTickets(filters),
      { initialProps: FIRST_PAGE }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender(SECOND_PAGE);

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
    expect(result.current.data?.pageNumber).toBe(1);
    expect(listRequest).toHaveBeenCalledTimes(2);
  });

  it("calls the endpoint exactly once per page", async () => {
    const { result } = renderQueryHook((filters: TicketFilters) => useSupportTickets(filters), {
      initialProps: FIRST_PAGE,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(listRequest).toHaveBeenCalledTimes(1);
  });

  it("surfaces a server error without retrying", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Boom" }, { status: 500 })
    );
    server.use(http.get(SUPPORT_URL, failingRequest));

    const { result } = renderQueryHook(
      (filters: TicketFilters) => useSupportTickets(filters),
      { initialProps: FIRST_PAGE }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
    expect(failingRequest).toHaveBeenCalledTimes(1);
  });
});
