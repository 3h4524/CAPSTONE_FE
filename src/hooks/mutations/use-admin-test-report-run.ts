"use client";

import { startAdminTestReportRun } from "@/api/admin-test-reports";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { TestReportRun } from "@/types/admin-test-reports";

export const useAdminTestReportRun = () => {
  const queryClient = useAppQueryClient();

  return useMutation<TestReportRun, void>({
    mutationFn: startAdminTestReportRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-test-reports"] });
      showToast("success", "The test run started. The report appears when it is over.");
    },
  });
};
