import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { LogPanel } from "@/components/admin/content-safety/log/log-panel";
import { server } from "@/test/mocks/server";
import { renderWithQuery } from "@/test/render-with-query";
import type { ModerationCheckDetail, ModerationCheckListItem } from "@/types/admin-moderation";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const resolveApiUrl = (path: string): string => new URL(path, process.env.NEXT_PUBLIC_API_BASE_URL).toString();

const item = (overrides: Partial<ModerationCheckListItem>): ModerationCheckListItem => ({
  id: "c1",
  createdAt: "2026-11-14T08:30:00Z",
  userId: "u1",
  userEmail: "seller@example.com",
  userName: "Seller",
  feature: "design_generation",
  direction: "input",
  subjectType: "product",
  decision: "block",
  decidedBy: "gemini",
  categories: ["sexual"],
  excerptPreview: "the product name: nứng quá",
  latencyMs: 1700,
  ...overrides,
});

const detail: ModerationCheckDetail = {
  ...item({}),
  subjectId: null,
  findings: [{ category: "sexual", severity: "high", field: "the product name", evidence: "nứng" }],
  reason: "Remove sexually explicit terms.",
  contentExcerpt: "the product name: nứng quá",
  model: "gemini-3.5-flash-lite",
  policyVersion: 1,
  contentHash: "abc",
};

describe("LogPanel", () => {
  it("lists checks, keeps no text for allowed ones, and opens a check with its evidence marked", async () => {
    let search = "";
    server.use(
      http.get(resolveApiUrl("/api/admin/moderation/checks"), ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json({
          items: [item({}), item({ id: "c2", decision: "allow", categories: [], excerptPreview: null })],
          totalCount: 2,
          pageNumber: 1,
          pageSize: 20,
          totalPages: 1,
        });
      }),
      http.get(resolveApiUrl("/api/admin/moderation/checks/c1"), () => HttpResponse.json(detail))
    );
    renderWithQuery(<LogPanel />);

    expect(await screen.findByText("the product name: nứng quá")).toBeInTheDocument();
    expect(screen.getByText("Allowed text is not kept")).toBeInTheDocument();
    expect(screen.getByText("1–2 of 2 checks")).toBeInTheDocument();
    const params = new URLSearchParams(search);
    expect(params.get("page")).toBe("1");
    expect(params.has("from")).toBe(true);

    await userEvent.click(screen.getAllByRole("row")[1]!);

    expect(await screen.findByText("Remove sexually explicit terms.")).toBeInTheDocument();
    expect(screen.getByText("nứng", { selector: "mark" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to allowlist" })).toBeInTheDocument();
  });
});
