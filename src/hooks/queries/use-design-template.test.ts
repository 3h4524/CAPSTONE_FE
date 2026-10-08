import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { useDesignTemplate } from "@/hooks/queries/use-design-template";
import { buildDesignTemplate } from "@/test/factories";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { waitFor } from "@testing-library/react";

const TEMPLATE_URL = new URL(
  "/api/design-templates/:id",
  process.env.NEXT_PUBLIC_API_BASE_URL
).toString();

const createTemplateResponder = () =>
  vi.fn(({ params }: { params: { id?: string } }) =>
    HttpResponse.json(buildDesignTemplate({ id: String(params.id) }))
  );

const registerTemplateHandler = () => {
  const detailRequest = createTemplateResponder();
  server.use(http.get(TEMPLATE_URL, detailRequest));
  return detailRequest;
};

describe("useDesignTemplate", () => {
  it("moves from loading to success and returns the template detail", async () => {
    registerTemplateHandler();

    const { result } = renderQueryHook(() => useDesignTemplate("template-1"));

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({ id: "template-1", name: "Vintage Botanical" });
    expect(result.current.data?.basePrompt).toBeTruthy();
  });

  it("requests the template behind the id in the url", async () => {
    registerTemplateHandler();

    const { result } = renderQueryHook(() => useDesignTemplate("template-7"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.id).toBe("template-7");
  });

  it("skips the request while the id is missing", () => {
    const detailRequest = registerTemplateHandler();

    const { result } = renderQueryHook(() => useDesignTemplate(null));

    expect(result.current.fetchStatus).toBe("idle");
    expect(detailRequest).not.toHaveBeenCalled();
  });

  it("skips the request when the caller passes enabled false", () => {
    const detailRequest = registerTemplateHandler();

    const { result } = renderQueryHook(() => useDesignTemplate("template-1", false));

    expect(result.current.fetchStatus).toBe("idle");
    expect(detailRequest).not.toHaveBeenCalled();
  });

  it("calls the endpoint exactly once because the wrapper disables retries", async () => {
    const detailRequest = registerTemplateHandler();

    const { result } = renderQueryHook(() => useDesignTemplate("template-1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(detailRequest).toHaveBeenCalledTimes(1);
  });

  it("surfaces a server error without retrying", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Boom" }, { status: 500 })
    );
    server.use(http.get(TEMPLATE_URL, failingRequest));

    const { result } = renderQueryHook(() => useDesignTemplate("template-1"));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
    expect(failingRequest).toHaveBeenCalledTimes(1);
  });
});
