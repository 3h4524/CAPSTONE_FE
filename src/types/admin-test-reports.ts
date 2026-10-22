export type TestReportStatus = "running" | "passed" | "failed" | "error";

export type TestReportSpecStatus =
  | "passed"
  | "failed"
  | "flaky"
  | "skipped"
  | "unknown";

export type TestReportRun = {
  runId: string;
  startedAtUtc: string;
  finishedAtUtc: string | null;
  durationMs: number;
  status: TestReportStatus;
  branch: string | null;
  commitSha: string | null;
  triggeredBy: string | null;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  flakyTests: number;
  skippedTests: number;
  fileCount: number;
  suiteCount: number;
  failureSummary: string | null;
};

export type TestReportSpec = {
  title: string;
  status: TestReportSpecStatus;
  durationMs: number;
  retries: number;
  errorMessage: string | null;
  errorStack: string | null;
  errorSnippet: string | null;
};

export type TestReportFile = {
  file: string;
  project: string;
  durationMs: number;
  status: TestReportSpecStatus;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  specs: TestReportSpec[];
};

export type TestReportDetail = {
  run: TestReportRun;
  files: TestReportFile[];
};

export type TestReportList = {
  items: TestReportRun[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
};

export type TestReportFilter = {
  fromUtc?: string;
  toUtc?: string;
  status?: TestReportStatus;
  pageIndex?: number;
  pageSize?: number;
};
