import { getAdminTestReports } from "@/api/admin-test-reports";
import type { TestReportFilter } from "@/types/admin-test-reports";
import { useQuery } from "@tanstack/react-query";

export const adminTestReportKeys = {
  all: ["admin-test-reports"] as const,
  list: (filter: TestReportFilter) =>
    [...adminTestReportKeys.all, "list", filter] as const,
};

export function useAdminTestReports(filter: TestReportFilter) {
  return useQuery({
    queryKey: adminTestReportKeys.list(filter),
    queryFn: () => getAdminTestReports(filter),
    refetchInterval: (query) =>
      query.state.data?.items.some((run) => run.status === "running") ? 5000 : false,
  });
}
