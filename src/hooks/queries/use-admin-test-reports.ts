import { getAdminTestReports } from "@/api/admin-test-reports";
import { useQuery } from "@/hooks/queries/use-query";
import type { TestReportFilter } from "@/types/admin-test-reports";

export const adminTestReportKeys = {
  all: ["admin-test-reports"] as const,
  list: (filter: TestReportFilter) =>
    [...adminTestReportKeys.all, "list", filter] as const,
};

export function useAdminTestReports(filter: TestReportFilter) {
  return useQuery({
    queryKey: adminTestReportKeys.list(filter),
    queryFn: () => getAdminTestReports(filter),
  });
}
