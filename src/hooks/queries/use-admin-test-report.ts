import { getAdminTestReport } from "@/api/admin-test-reports";
import { useQuery } from "@tanstack/react-query";

import { adminTestReportKeys } from "./use-admin-test-reports";

export function useAdminTestReport(runId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...adminTestReportKeys.all, "detail", runId],
    queryFn: () => getAdminTestReport(runId),
    enabled: options?.enabled ?? true,
  });
}
