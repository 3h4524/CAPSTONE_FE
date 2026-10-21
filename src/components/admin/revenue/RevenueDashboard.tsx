"use client";

import React, { useState } from "react";
import { toast } from "sonner";

import { getRevenueInvoices } from "@/api/revenue";
import { AdminShell } from "@/components/admin/admin-shell";
import { useRevenueCharts, useRevenueInvoices,useRevenueMetrics } from "@/hooks/queries/use-revenue";
import type { RevenueFilterDto } from "@/types/revenue";

import { RevenueCharts } from "./RevenueCharts";
import { RevenueFilterBar } from "./RevenueFilterBar";
import { RevenueInvoiceTable } from "./RevenueInvoiceTable";
import { RevenueMetricCards } from "./RevenueMetricCards";

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

  // Queries
  const { data: metricsData, isLoading: isLoadingMetrics } = useRevenueMetrics(filter);
  const { data: chartsData, isLoading: isLoadingCharts } = useRevenueCharts(filter);
  const { data: invoicesData, isLoading: isLoadingInvoices } = useRevenueInvoices(filter);

  const handlePageChange = (newPage: number) => {
    setFilter(prev => ({ ...prev, page: newPage }));
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      
      const exportFilter = { ...filter, page: 1, pageSize: 999999 };
      const data = await getRevenueInvoices(exportFilter);
      
      if (!data || data.items.length === 0) {
        toast.error("No data found to export.");
        return;
      }

      const headers = ["Invoice No", "Customer Name", "Customer Email", "Plan", "Payment Date", "Amount (VND)"];
      const csvContent = data.items.map(i => {
        const date = i.paymentDate ? new Date(i.paymentDate).toLocaleDateString() : 'N/A';
        const cost = Math.round(i.amount * 1000).toString();
        
        return [
          i.invoiceNumber, 
          `"${i.customerName.replace(/"/g, '""')}"`, 
          `"${i.customerEmail}"`, 
          i.planName, 
          date, 
          cost
        ].join(",");
      });

      const csvData = [headers.join(","), ...csvContent].join("\n");
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `revenue_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success(`Exported ${data.items.length} invoices successfully!`);
    } catch {
      toast.error("An error occurred while exporting data.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminShell pageTitle="revenue">
      <div className="flex h-full flex-col gap-6 p-6">
        <RevenueFilterBar
          filter={filter}
          onFilterChange={setFilter}
          currency={currency}
          onCurrencyChange={setCurrency}
        />

        <RevenueMetricCards
          metrics={metricsData}
          isLoading={isLoadingMetrics}
          currency={currency}
        />

        <RevenueCharts charts={chartsData} isLoading={isLoadingCharts} currency={currency} />

      <RevenueInvoiceTable 
        data={invoicesData} 
        isLoading={isLoadingInvoices} 
        page={filter.page || 1}
        onPageChange={handlePageChange}
        onExportClick={handleExportCSV}
        isExporting={isExporting}
      />
      </div>
    </AdminShell>
  );
}
