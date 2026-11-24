import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { listSellerOpportunities, refreshSellerOpportunities } from "@/api/market-opportunities";
import { server } from "@/test/mocks/server";

const resolveApiUrl = (path: string): string => new URL(path, process.env.NEXT_PUBLIC_API_BASE_URL).toString();

describe("seller market radar loading", () => {
  it.each([undefined, "saved"])("keeps the refreshed ranking when reloading with state %s", async (state) => {
    const ranking = Array.from({ length: 100 }, (_, index) => ({
      id: `opportunity-${index + 1}`,
      rank: index + 1,
      finalScore: 90 - index / 10,
      state: state ?? "new",
    }));
    let requestedState: string | null = null;
    server.use(
      http.post(resolveApiUrl("/api/market-opportunities/refresh"), () => HttpResponse.json(ranking)),
      http.get(resolveApiUrl("/api/market-opportunities"), ({ request }) => {
        const params = new URL(request.url).searchParams;
        requestedState = params.get("state");
        // The API defaults to 50, while building the radar returns up to 100.
        const limit = Number(params.get("limit") ?? 50);
        return HttpResponse.json(ranking.slice(0, limit));
      })
    );

    const refreshed = await refreshSellerOpportunities();
    const reloaded = await listSellerOpportunities(state);

    expect(reloaded).toHaveLength(100);
    expect(reloaded).toEqual(refreshed);
    expect(requestedState).toBe(state ?? null);
  });
});
