import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { deleteMockupTemplate, listSystemMockupTemplates, setMockupTemplateView, updateMockupTemplate } from "@/api/mockup-templates";
import { server } from "@/test/mocks/server";

const resolveApiUrl = (path: string): string => new URL(path, process.env.NEXT_PUBLIC_API_BASE_URL).toString();

const input = { name: "Tee", productType: "tshirt", x: 1, y: 2, width: 3, height: 4, baseImage: null, allowRecolor: false, garmentColor: null };

describe("mock-up templates api scope", () => {
  it("changes a seller's own template on the seller endpoint by default", async () => {
    let called = false;
    server.use(
      http.put(resolveApiUrl("/api/mockup-templates/t-1"), () => {
        called = true;
        return HttpResponse.json({ id: "t-1" });
      })
    );

    await updateMockupTemplate("t-1", input);

    expect(called).toBe(true);
  });

  it("changes a shared template on the admin endpoint", async () => {
    const paths: string[] = [];
    server.use(
      http.put(resolveApiUrl("/api/admin/mockup-templates/t-1"), ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return HttpResponse.json({ id: "t-1" });
      }),
      http.put(resolveApiUrl("/api/admin/mockup-templates/t-1/views/back"), ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return HttpResponse.json({ id: "t-1" });
      }),
      http.delete(resolveApiUrl("/api/admin/mockup-templates/t-1"), ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return new HttpResponse(null, { status: 204 });
      })
    );

    await updateMockupTemplate("t-1", input, "admin");
    await setMockupTemplateView("t-1", "back", null, "admin");
    await deleteMockupTemplate("t-1", "admin");

    expect(paths).toEqual(["/api/admin/mockup-templates/t-1", "/api/admin/mockup-templates/t-1/views/back", "/api/admin/mockup-templates/t-1"]);
  });

  it("lists the shared templates for an admin", async () => {
    server.use(http.get(resolveApiUrl("/api/admin/mockup-templates"), () => HttpResponse.json([{ id: "s-1", isSystemTemplate: true }])));

    const templates = await listSystemMockupTemplates();

    expect(templates.map((template) => template.id)).toEqual(["s-1"]);
  });
});
