import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import { buildMockupTemplate } from "@/test/factories";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { waitFor } from "@testing-library/react";

const MOCKUP_URL = new URL("/api/mockup-templates", process.env.NEXT_PUBLIC_API_BASE_URL).toString();

const TEMPLATES = [
  buildMockupTemplate({ id: "mockup-1", name: "Alpha mug", usageCount: 1 }),
  buildMockupTemplate({ id: "mockup-2", name: "Zulu tote", usageCount: 9 }),
  buildMockupTemplate({ id: "mockup-3", name: "Bravo shirt", usageCount: 5 }),
];

const createMockupResponder = () => vi.fn(() => HttpResponse.json(TEMPLATES));

describe("useMockupTemplates", () => {
  let listRequest: ReturnType<typeof createMockupResponder>;

  beforeEach(() => {
    listRequest = createMockupResponder();
    server.use(http.get(MOCKUP_URL, listRequest));
  });

  it("moves from loading to success and returns the templates", async () => {
    const { result } = renderQueryHook(() => useMockupTemplates());

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(3);
  });

  it("orders the list by usage count through the select transform", async () => {
    const { result } = renderQueryHook(() => useMockupTemplates());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((item) => item.name)).toEqual([
      "Zulu tote",
      "Bravo shirt",
      "Alpha mug",
    ]);
  });

  it("breaks a usage count tie by name", async () => {
    const tiedTemplates = [
      buildMockupTemplate({ id: "mockup-2", name: "Zulu tote", usageCount: 4 }),
      buildMockupTemplate({ id: "mockup-1", name: "Alpha mug", usageCount: 4 }),
    ];
    server.use(http.get(MOCKUP_URL, () => HttpResponse.json(tiedTemplates)));

    const { result } = renderQueryHook(() => useMockupTemplates());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((item) => item.id)).toEqual(["mockup-1", "mockup-2"]);
  });

  it("skips the request while disabled", () => {
    const { result } = renderQueryHook(() => useMockupTemplates("mug", false));

    expect(result.current.fetchStatus).toBe("idle");
    expect(listRequest).not.toHaveBeenCalled();
  });

  it("calls the endpoint exactly once", async () => {
    const { result } = renderQueryHook(() => useMockupTemplates("mug"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(listRequest).toHaveBeenCalledTimes(1);
  });

  it("surfaces a server error without retrying", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Boom" }, { status: 500 })
    );
    server.use(http.get(MOCKUP_URL, failingRequest));

    const { result } = renderQueryHook(() => useMockupTemplates("mug"));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
    expect(failingRequest).toHaveBeenCalledTimes(1);
  });
});
