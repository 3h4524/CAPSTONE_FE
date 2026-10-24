import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RunTook } from "@/components/admin/test-reports/run-took";
import type { TestReportRun } from "@/types/admin-test-reports";
import { cleanup, render, screen } from "@testing-library/react";

const buildRun = (overrides: Partial<TestReportRun> = {}): TestReportRun => ({
  runId: "run-1",
  startedAtUtc: "2026-10-24T04:28:00Z",
  finishedAtUtc: null,
  durationMs: 0,
  status: "running",
  branch: null,
  commitSha: null,
  triggeredBy: null,
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
  ...overrides,
});

describe("RunTook", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows an em dash for a finished run with no duration", () => {
    render(<RunTook run={buildRun({ status: "passed", durationMs: 0 })} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("formats milliseconds, seconds and minutes", () => {
    render(
      <>
        <RunTook run={buildRun({ status: "passed", durationMs: 450 })} />
        <RunTook run={buildRun({ status: "failed", durationMs: 12340 })} />
        <RunTook run={buildRun({ status: "error", durationMs: 131500 })} />
      </>
    );

    expect(screen.getByText("450 ms")).toBeInTheDocument();
    expect(screen.getByText("12.3 s")).toBeInTheDocument();
    expect(screen.getByText("2m 12s")).toBeInTheDocument();
  });

  describe("while the run is live", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-24T04:28:05Z"));
    });

    it("counts up from the elapsed time, never below one second", () => {
      const run = buildRun();

      const { rerender } = render(<RunTook run={run} />);

      expect(screen.getByText("5 s")).toBeInTheDocument();

      vi.advanceTimersByTime(65000);
      rerender(<RunTook run={run} />);

      expect(screen.getByText("1m 10s")).toBeInTheDocument();
    });

    it("keeps the static duration once the run stops", () => {
      const { rerender } = render(
        <RunTook run={buildRun({ status: "passed", durationMs: 131500 })} />
      );

      vi.advanceTimersByTime(5000);
      rerender(
        <RunTook run={buildRun({ status: "passed", durationMs: 131500 })} />
      );

      expect(screen.getByText("2m 12s")).toBeInTheDocument();
    });
  });
});
