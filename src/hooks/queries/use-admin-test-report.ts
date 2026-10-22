import { getAdminTestReport } from "@/api/admin-test-reports";
import { useQuery } from "@tanstack/react-query";

import { adminTestReportKeys } from "./use-admin-test-reports";

export function useAdminTestReport(runId: string) {
  return useQuery({
    queryKey: [...adminTestReportKeys.all, "detail", runId],
    queryFn: () => getAdminTestReport(runId),
    refetchInterval: (query) =>
      query.state.data?.run.status === "running" ? 5000 : false,
  });
}
