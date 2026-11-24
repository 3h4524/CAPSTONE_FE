import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { useAdminTestReportRun } from "@/hooks/mutations/use-admin-test-report-run";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import type { TestReportRun } from "@/types/admin-test-reports";
import { act, waitFor } from "@testing-library/react";

const RUNS_URL = new URL(
  "/api/admin/test-reports/runs",
  process.env.NEXT_PUBLIC_API_BASE_URL
).toString();

const mockRun: TestReportRun = {
  runId: "run-20261124-204000",
  startedAtUtc: "2026-11-24T20:40:00Z",
  finishedAtUtc: null,
  durationMs: 0,
  status: "running",
  branch: "feat/test-run-modes",
  commitSha: "abc1234",
  triggeredBy: "admin@apcs.test",
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  flakyTests: 0,
  skippedTests: 0,
  knownIssueTests: 0,
  unexpectedFailedTests: 0,
  fileCount: 0,
  suiteCount: 0,
  failureSummary: null,
};

describe("useAdminTestReportRun", () => {
  it("starts a test run with explicit execution mode", async () => {
    let capturedBody: unknown = null;

    server.use(
      http.post(RUNS_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(mockRun, { status: 202 });
      })
    );

    const { result } = renderQueryHook(() => useAdminTestReportRun());

    act(() => {
      result.current.mutate({ mode: "headed" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(capturedBody).toEqual({ mode: "headed" });
  });

  it("starts a test run with debug mode", async () => {
    let capturedBody: unknown = null;

    server.use(
      http.post(RUNS_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(mockRun, { status: 202 });
      })
    );

    const { result } = renderQueryHook(() => useAdminTestReportRun());

    act(() => {
      result.current.mutate({ mode: "debug" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(capturedBody).toEqual({ mode: "debug" });
  });

  it("starts a test run without variables", async () => {
    let capturedBody: unknown = null;

    server.use(
      http.post(RUNS_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(mockRun, { status: 202 });
      })
    );

    const { result } = renderQueryHook(() => useAdminTestReportRun());

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(capturedBody).toEqual({});
  });
});
