import { adminImageQualityKeys, getAdminImageEvalRuns } from "@/api/admin-image-quality";
import { useQuery } from "@/hooks/queries/use-query";

export const useAdminImageEvalRuns = () =>
  useQuery({
    queryKey: adminImageQualityKeys.runs(),
    queryFn: getAdminImageEvalRuns,
  });
