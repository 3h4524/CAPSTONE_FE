"use client";

import { exportAdminDashboardReport } from "@/api/admin";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useExportAdminDashboardReport = () =>
  useMutation<void, string>({
    mutationFn: (timeRange: string) => exportAdminDashboardReport(timeRange),
    onSuccess: () => {
      showToast("success", "Report exported successfully.");
    },
  });
