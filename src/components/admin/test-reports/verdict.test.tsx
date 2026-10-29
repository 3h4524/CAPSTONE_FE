import { describe, expect, it } from "vitest";

import { TestReportVerdict } from "@/components/admin/test-reports/verdict";
import type { TestReportRun } from "@/types/admin-test-reports";
import { render, screen } from "@testing-library/react";

const buildRun = (overrides: Partial<TestReportRun> = {}): TestReportRun => ({
  runId: "run-1",
  startedAtUtc: "2026-10-24T04:28:00Z",
  finishedAtUtc: "2026-10-24T04:31:00Z",
  durationMs: 231000,
  status: "passed",
  branch: "main",
  commitSha: null,
  triggeredBy: null,
  totalTests: 70,
  passedTests: 70,
  failedTests: 0,
  flakyTests: 0,
  skippedTests: 0,
  knownIssueTests: 0,
  unexpectedFailedTests: 0,
  fileCount: 20,
  suiteCount: 0,
  failureSummary: null,
  ...overrides,
});

describe("TestReportVerdict", () => {
  it("announces the live run instead of a green verdict", () => {
    render(<TestReportVerdict run={buildRun({ status: "running" })} />);

    expect(screen.getByText("The suite is running")).toBeInTheDocument();
  });

  it("introduces an infrastructure error as a broken run", () => {
    render(
      <TestReportVerdict
        run={buildRun({ status: "error", failedTests: 0, passedTests: 0 })}
      />
    );

    expect(
      screen.getByText("The run broke before it could report")
    ).toBeInTheDocument();
  });

  it("never shows a green verdict while failures exist", () => {
    render(
      <TestReportVerdict
        run={buildRun({
          status: "failed",
          passedTests: 66,
          failedTests: 4,
          unexpectedFailedTests: 4,
        })}
      />
    );

    expect(screen.getByText("4 of 4 failed tests need a look")).toBeInTheDocument();
  });

  it("celebrates a fully green run", () => {
    render(<TestReportVerdict run={buildRun()} />);

    expect(screen.getByText("Every test passed")).toBeInTheDocument();
  });
});
