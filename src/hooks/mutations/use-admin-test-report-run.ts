"use client";

import { startAdminTestReportRun } from "@/api/admin-test-reports";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { TestReportRun, TestReportRunMode } from "@/types/admin-test-reports";

export const useAdminTestReportRun = () => {
  const queryClient = useAppQueryClient();

  return useMutation<TestReportRun, { mode?: TestReportRunMode } | void>({
    mutationFn: (variables) =>
      startAdminTestReportRun(
        variables && typeof variables === "object" && "mode" in variables && variables.mode
          ? { mode: variables.mode }
          : undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-test-reports"] });
      showToast("success", "The test run started. The report appears when it is over.");
    },
  });
};
