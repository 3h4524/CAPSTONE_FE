"use client";

import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type {
  TestReportSpecStatus,
  TestReportStatus,
} from "@/types/admin-test-reports";
import { cn } from "@/utils/cn";

const RUN_STYLES: Record<TestReportStatus, string> = {
  running: "border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300",
  passed: "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300",
  error: "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const SPEC_STYLES: Record<TestReportSpecStatus, string> = {
  passed: "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300",
  flaky: "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
  skipped: "border-ink-200 bg-ink-50 text-ink-500",
  unknown: "border-ink-200 bg-ink-50 text-ink-500",
};

const STATUS_LABEL_KEYS: Record<TestReportStatus | TestReportSpecStatus, string> = {
  running: "admin.testReports.status.running",
  passed: "admin.testReports.status.passed",
  failed: "admin.testReports.status.failed",
  error: "admin.testReports.status.error",
  flaky: "admin.testReports.status.flaky",
  skipped: "admin.testReports.status.skipped",
  unknown: "admin.testReports.status.unknown",
};

type TestReportStatusBadgeProps = {
  status: TestReportStatus | TestReportSpecStatus;
  className?: string;
};

export const TestReportStatusBadge = ({
  status,
  className,
}: TestReportStatusBadgeProps) => {
  const { t } = useTranslation("common");
  const style = RUN_STYLES[status as TestReportStatus] ?? SPEC_STYLES[status as TestReportSpecStatus];

  return (
    <Badge
      variant="outline"
      className={cn(
        "px-1.5 py-0 text-[10px] font-bold tracking-wide uppercase",
        style,
        className
      )}
    >
      {t(STATUS_LABEL_KEYS[status])}
    </Badge>
  );
};
