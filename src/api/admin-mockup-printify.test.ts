import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import {
  createPrintifyTemplate,
  isJobRunning,
  jobPollInterval,
  printableViews,
  searchAdminPrintifyBlueprints,
  startPrintifyTemplateUpdateJob,
} from "@/api/admin-mockup-printify";
import { server } from "@/test/mocks/server";

const resolveApiUrl = (path: string): string => new URL(path, process.env.NEXT_PUBLIC_API_BASE_URL).toString();

describe("admin mock-up Printify api", () => {
  it("offers only the sides the provider prints on, front first", () => {
    expect(printableViews(["back", "front", "neck"])).toEqual(["front", "back"]);
    expect(printableViews(["front", "left_sleeve", "right_sleeve", "back"])).toEqual(["front", "back", "left", "right"]);
    expect(printableViews([])).toEqual([]);
    expect(printableViews(["front_dtf", "back_dtf", "left_sleeve_dtf", "right_sleeve_dtf"])).toEqual(["front", "back", "left", "right"]);
    expect(printableViews(["front_left_chest"])).toEqual([]);
    expect(printableViews(["front_side_dtf", "back_side_dtf", "neck_outer"])).toEqual(["front", "back"]);
    expect(printableViews(["back_neck", "front_dtg"])).toEqual(["front"]);
  });

  it("asks for a job's progress until it is done or failed", () => {
    expect(jobPollInterval(undefined)).toBe(3000);
    expect(jobPollInterval({ status: "queued" })).toBe(3000);
    expect(jobPollInterval({ status: "running" })).toBe(3000);
    expect(jobPollInterval({ status: "done" })).toBe(false);
    expect(jobPollInterval({ status: "failed" })).toBe(false);
    expect(isJobRunning({ status: "done" })).toBe(false);
  });

  it("searches the catalog through the admin endpoint, never the seller's", async () => {
    let search = "";
    server.use(
      http.get(resolveApiUrl("/api/admin/mockup-templates/printify/blueprints"), ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([{ id: 6, title: "Unisex Heavy Cotton Tee", brand: "Gildan", model: "5000", imageUrl: null }]);
      })
    );

    const found = await searchAdminPrintifyBlueprints("gildan 5000");

    expect(found[0]?.id).toBe(6);
    expect(new URLSearchParams(search).get("q")).toBe("gildan 5000");
  });

  it("measures more of a linked template on its own endpoint", async () => {
    let body: unknown = null;
    server.use(
      http.post(resolveApiUrl("/api/admin/mockup-templates/t-1/printify/jobs"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ jobId: "j-1", status: "queued" });
      })
    );

    const job = await startPrintifyTemplateUpdateJob("t-1", { views: ["back"], colors: ["Navy"] });

    expect(job.jobId).toBe("j-1");
    expect(body).toEqual({ views: ["back"], colors: ["Navy"] });
  });

  it("sends the picked camera of each side when the template is made", async () => {
    let body: unknown = null;
    server.use(
      http.post(resolveApiUrl("/api/admin/mockup-templates/printify/jobs/j-1/create"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: "t-2", name: "Gildan 5000" });
      })
    );

    await createPrintifyTemplate("j-1", { cameras: { front: "front", back: "back-2" }, colors: ["White"], name: "Gildan 5000", productType: "tshirt" });

    expect(body).toEqual({ cameras: { front: "front", back: "back-2" }, colors: ["White"], name: "Gildan 5000", productType: "tshirt" });
  });
});
