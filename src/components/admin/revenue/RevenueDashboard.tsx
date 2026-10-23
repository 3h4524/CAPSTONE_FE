"use client";

import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { getRevenueInvoices } from "@/api/revenue";
import { AdminShell } from "@/components/admin/admin-shell";
import { buildRevenueReport, reportFileName, toCsv } from "@/helpers/revenue-report";
import { toXlsx } from "@/helpers/revenue-report-xlsx";
import { useAdminSubscriptionPlans } from "@/hooks/queries/use-admin-subscription-plans";
import { useRevenueCharts, useRevenueInsights, useRevenueInvoices, useRevenueMetrics } from "@/hooks/queries/use-revenue";
import type { RevenueFilterDto, TransactionStatus } from "@/types/revenue";

import { RevenueCharts } from "./RevenueCharts";
import { RevenueFilterBar } from "./RevenueFilterBar";
import { type ReportFormat, RevenueGrowthCard } from "./RevenueGrowthCard";
import { RevenueInsightsRow } from "./RevenueInsightsRow";
import { RevenueInvoiceTable, type TransactionTableFilter } from "./RevenueInvoiceTable";
import { RevenueMetricCards } from "./RevenueMetricCards";

const TRANSACTIONS_PAGE_SIZE = 5;


export function RevenueDashboard() {
  const [filter, setFilter] = useState<RevenueFilterDto>({
    startDate: `${new Date().getFullYear()}-01-01`, // First day of current year
    endDate: new Date().toISOString().split("T")[0], // Today
    granularity: "Month",
    page: 1,
    pageSize: 10
  });

  const [isExporting, setIsExporting] = useState(false);
  const [currency, setCurrency] = useState<"VND" | "USD">("VND");

  // The transaction table's own search/filters/page live apart from the page-wide period filter, so
  // paging or searching the table does not refetch the KPIs and charts.
  const [tableFilter, setTableFilter] = useState<TransactionTableFilter>({ search: "", plan: "", status: "" });
  const [tablePage, setTablePage] = useState(1);

  const invoiceFilter = useMemo<RevenueFilterDto>(
    () => ({
      ...filter,
      page: tablePage,
      pageSize: TRANSACTIONS_PAGE_SIZE,
      search: tableFilter.search || undefined,
      plan: tableFilter.plan || undefined,
      status: tableFilter.status || undefined,
    }),
    [filter, tablePage, tableFilter]
  );

  // Queries
  const { data: metricsData, isLoading: isLoadingMetrics } = useRevenueMetrics(filter);
  const { data: chartsData, isLoading: isLoadingCharts } = useRevenueCharts(filter);
  const { data: insightsData, isLoading: isLoadingInsights } = useRevenueInsights(filter);
  const { data: invoicesData, isLoading: isLoadingInvoices } = useRevenueInvoices(invoiceFilter);
  const { data: plans } = useAdminSubscriptionPlans();

  const planOptions = useMemo(() => (plans ?? []).map((p) => p.name), [plans]);

  const handleFilterChange = useCallback((next: RevenueFilterDto) => {
    setFilter(next);
    setTablePage(1);
  }, []);

  const handleTableFilterChange = useCallback((next: TransactionTableFilter) => {
    setTableFilter(next);
    setTablePage(1);
  }, []);

  // An alert's "Review" filters the transaction table by its status and scrolls to it. The search box
  // keeps its own draft, so only the status (and plan) change here.
  const handleReviewAlert = useCallback((status: TransactionStatus) => {
    setTableFilter((prev) => ({ ...prev, plan: "", status }));
    setTablePage(1);
    document.getElementById("recent-transactions")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleExport = async (format: ReportFormat) => {
    if (!metricsData || !chartsData || !insightsData) {
      toast.error("The dashboard is still loading. Try again in a moment.");
      return;
    }

    try {
      setIsExporting(true);

      // The Transactions sheet holds every row the table matches (period + search + plan + status).
      const transactions = await getRevenueInvoices({ ...invoiceFilter, page: 1, pageSize: 999999 });
      const sections = buildRevenueReport({
        filter,
        currency,
        generatedAt: new Date(),
        metrics: metricsData,
        charts: chartsData,
        insights: insightsData,
        transactions: transactions?.items ?? [],
        transactionFilter: tableFilter,
      });

      const blob =
        format === "xlsx"
          ? await toXlsx(sections, currency)
          : new Blob([toCsv(sections)], { type: "text/csv;charset=utf-8" });
      downloadBlob(blob, `${reportFileName(filter)}.${format}`);

      toast.success(`Revenue report exported as ${format === "xlsx" ? "Excel" : "CSV"}.`);
    } catch {
      toast.error("An error occurred while exporting the report.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminShell pageTitle="revenue">
      <div className="flex h-full flex-col gap-4 p-0">
        <RevenueFilterBar
          filter={filter}
          onFilterChange={handleFilterChange}
          currency={currency}
          onCurrencyChange={setCurrency}
        />

        <RevenueMetricCards
          metrics={metricsData}
          isLoading={isLoadingMetrics}
          currency={currency}
        />

        <RevenueCharts
          charts={chartsData}
          isLoading={isLoadingCharts}
          currency={currency}
          filter={filter}
        />

        <RevenueInsightsRow
          data={insightsData}
          isLoading={isLoadingInsights}
          currency={currency}
          onReviewAlert={handleReviewAlert}
        />

        <div id="recent-transactions" className="grid scroll-mt-4 grid-cols-1 gap-4 xl:grid-cols-4">
          <div className="min-w-0 xl:col-span-3">
            <RevenueInvoiceTable
              data={invoicesData}
              isLoading={isLoadingInvoices}
              currency={currency}
              startDate={filter.startDate}
              endDate={filter.endDate}
              planOptions={planOptions}
              tableFilter={tableFilter}
              onTableFilterChange={handleTableFilterChange}
              page={tablePage}
              onPageChange={setTablePage}
            />
          </div>
          <RevenueGrowthCard
            onExport={handleExport}
            isExporting={isExporting}
            transactionCount={invoicesData?.totalCount ?? 0}
            startDate={filter.startDate}
            endDate={filter.endDate}
          />
        </div>
      </div>
    </AdminShell>
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.hidden = true;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
