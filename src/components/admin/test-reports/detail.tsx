"use client";

import { useMemo } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TestReportComparison } from "@/components/admin/test-reports/comparison";
import { TestReportFailureGroups } from "@/components/admin/test-reports/failure-groups";
import { TestReportFileAccordion } from "@/components/admin/test-reports/file-accordion";
import { TestReportFileFailures } from "@/components/admin/test-reports/file-failures";
import { TestReportRunTrend } from "@/components/admin/test-reports/run-trend";
import { TestReportSlowestSpecs } from "@/components/admin/test-reports/slowest-specs";
import { TestReportVerdict } from "@/components/admin/test-reports/verdict";
import { PageHeader } from "@/components/commons/layout/page-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useAdminTestReport } from "@/hooks/queries/use-admin-test-report";
import { useAdminTestReports } from "@/hooks/queries/use-admin-test-reports";
import { useTestReportEvents } from "@/hooks/use-test-report-events";

type TestReportDetailProps = {
  runId: string;
};

export const TestReportDetail = ({ runId }: TestReportDetailProps) => {
  const { t } = useTranslation("common");
  const { data, isLoading, isError, refetch } = useAdminTestReport(runId);
  const { data: list } = useAdminTestReports({ pageSize: 20 });
  useTestReportEvents();

  const previousRunId = useMemo(() => {
    const runs = list?.items ?? [];
    const index = runs.findIndex((run) => run.runId === runId);
    return index >= 0 ? runs[index + 1]?.runId : undefined;
  }, [list?.items, runId]);

  const { data: previous } = useAdminTestReport(previousRunId ?? "", {
    enabled: Boolean(previousRunId),
  });

  const isRunning = data?.run.status === "running";

  const header = (
    <PageHeader
      title={runId}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/admin/test-reports">
                  {t("admin.testReports.detail.breadcrumbAll")}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t("admin.testReports.detail.breadcrumbReport")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="size-8 p-0"
          aria-label={t("admin.testReports.detail.refreshAriaLabel")}
        >
          <RefreshCw className="size-4" />
        </Button>
      }
    />
  );

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div className="rounded-lg border border-rose-200 bg-rose-50/50 px-5 py-14 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
          <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">
            {t("admin.testReports.detail.loadErrorTitle")}
          </p>
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {t("admin.testReports.detail.loadErrorDescription")}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            <RefreshCw className="size-4" />
            {t("admin.testReports.detail.tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div className="space-y-4">
          <div className="bg-ink-100 h-36 animate-pulse rounded-xl" />
          <div className="bg-ink-100 h-64 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}
      <TestReportVerdict run={data.run} />
      {isRunning ? (
        <p className="text-ink-600 rounded-xl border border-sky-100 bg-sky-50/40 px-5 py-4 text-xs leading-relaxed dark:border-sky-500/30 dark:bg-sky-500/10">
          {t("admin.testReports.detail.liveNotice")}
        </p>
      ) : (
        <>
          <TestReportComparison current={data} previous={previousRunId ? previous : undefined} />

          <TestReportRunTrend runs={list?.items ?? []} currentRunId={runId} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TestReportFailureGroups files={data.files} />
            <TestReportFileFailures files={data.files} />
          </div>

          <section className="border-ink-200 bg-card overflow-hidden rounded-xl border">
            <div className="border-ink-100 border-b px-5 py-4">
              <h3 className="text-ink-800 text-xs font-bold tracking-wide uppercase">
                {t("admin.testReports.detail.slowestTestsHeading")}
              </h3>
              <p className="text-ink-400 mt-0.5 text-[10px]">
                {t("admin.testReports.detail.slowestTestsDescription")}
              </p>
            </div>
            <TestReportSlowestSpecs files={data.files} limit={6} />
          </section>

          <TestReportFileAccordion files={data.files} />
        </>
      )}
    </div>
  );
};
