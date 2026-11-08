import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import {
  createAdminImageEvalRun,
  deleteAdminImageEvalRun,
  getAdminImageQualityLive,
} from "@/api/admin-image-quality";
import { server } from "@/test/mocks/server";

const resolveApiUrl = (path: string): string =>
  new URL(path, process.env.NEXT_PUBLIC_API_BASE_URL).toString();

describe("admin image quality api", () => {
  it("asks for the live stats of the whole history when no period is set", async () => {
    const responder = vi.fn(({ request }: { request: Request }) =>
      HttpResponse.json({ generatedAtUtc: "2026-10-31T00:00:00Z", versions: [], url: request.url })
    );
    server.use(http.get(resolveApiUrl("/api/admin/image-quality/live"), responder));

    const stats = await getAdminImageQualityLive({});

    expect(stats.versions).toEqual([]);
    expect(new URL(responder.mock.calls[0]?.[0].request.url ?? "").search).toBe("");
  });

  it("passes the start of the period to the live stats", async () => {
    let search = "";
    server.use(
      http.get(resolveApiUrl("/api/admin/image-quality/live"), ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json({ generatedAtUtc: "2026-10-31T00:00:00Z", versions: [] });
      })
    );

    await getAdminImageQualityLive({ fromUtc: "2026-10-01T00:00:00.000Z" });

    expect(new URLSearchParams(search).get("fromUtc")).toBe("2026-10-01T00:00:00.000Z");
  });

  it("posts the parsed export file as JSON", async () => {
    let body: unknown = null;
    server.use(
      http.post(resolveApiUrl("/api/admin/image-quality/evaluations"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            id: "run-1",
            name: "Run",
            notes: null,
            createdAtUtc: "2026-10-31T00:00:00Z",
            uploadedBy: null,
            imageCount: 0,
            productCount: 0,
            versions: [],
          },
          { status: 201 }
        );
      })
    );

    const run = await createAdminImageEvalRun({ name: "Run", notes: null, versions: [], images: [] });

    expect(run.id).toBe("run-1");
    expect(body).toEqual({ name: "Run", notes: null, versions: [], images: [] });
  });

  it("deletes a run by its id", async () => {
    const responder = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.delete(resolveApiUrl("/api/admin/image-quality/evaluations/run-1"), responder));

    await deleteAdminImageEvalRun("run-1");

    expect(responder).toHaveBeenCalledTimes(1);
  });
});
