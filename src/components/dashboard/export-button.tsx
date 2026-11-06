"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildDashboardCsv } from "@/helpers/seller-dashboard";
import { showToast } from "@/helpers/toast";
import type { DashboardSummary } from "@/types/seller-dashboard";

/** Downloads the Dashboard's figures for the period as a CSV. */
export const ExportButton = ({ summary }: { summary: DashboardSummary }) => {
  const exportCsv = () => {
    try {
      const url = URL.createObjectURL(
        new Blob([buildDashboardCsv(summary)], { type: "text/csv;charset=utf-8" })
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `dashboard-${summary.periodDays}d-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("error", "We couldn't export your dashboard. Please try again.");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 rounded-full"
      onClick={exportCsv}
    >
      <Download className="size-3.5" aria-hidden="true" />
      Export
    </Button>
  );
};
