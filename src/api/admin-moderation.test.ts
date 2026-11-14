import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { createModerationTerm, getModerationChecks, updateModerationSettings } from "@/api/admin-moderation";
import { server } from "@/test/mocks/server";

const resolveApiUrl = (path: string): string => new URL(path, process.env.NEXT_PUBLIC_API_BASE_URL).toString();

describe("admin moderation api", () => {
  it("sends only the log filters that were chosen", async () => {
    let search = "";
    server.use(
      http.get(resolveApiUrl("/api/admin/moderation/checks"), ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20, totalPages: 0 });
      })
    );

    await getModerationChecks({ page: 2, pageSize: 20, decision: "block", search: "", category: undefined });

    const params = new URLSearchParams(search);
    expect(params.get("page")).toBe("2");
    expect(params.get("decision")).toBe("block");
    expect(params.has("search")).toBe(false);
    expect(params.has("category")).toBe(false);
  });

  it("posts a new blocklist term as JSON", async () => {
    let body: unknown = null;
    server.use(
      http.post(resolveApiUrl("/api/admin/moderation/terms"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: "t1", ...(body as object), updatedAt: "2026-11-14T00:00:00Z" });
      })
    );

    const term = await createModerationTerm({
      term: "nứng",
      category: "sexual",
      severity: "block",
      matchType: "word",
      matchUnaccented: false,
      language: "vi",
      isActive: true,
      note: null,
    });

    expect(body).toMatchObject({ term: "nứng", severity: "block", matchUnaccented: false });
    expect(term.id).toBe("t1");
  });

  it("puts the settings with each changed threshold", async () => {
    let body: unknown = null;
    server.use(
      http.put(resolveApiUrl("/api/admin/moderation/settings"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({});
      })
    );

    await updateModerationSettings({ enabled: true, blockAt: { sexual: "medium" } });

    expect(body).toEqual({ enabled: true, blockAt: { sexual: "medium" } });
  });
});
