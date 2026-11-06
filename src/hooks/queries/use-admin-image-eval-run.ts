import { adminImageQualityKeys, getAdminImageEvalRun } from "@/api/admin-image-quality";
import { useQuery } from "@/hooks/queries/use-query";

export const useAdminImageEvalRun = (id: string | null) =>
  useQuery({
    queryKey: adminImageQualityKeys.run(id ?? ""),
    queryFn: () => getAdminImageEvalRun(id ?? ""),
    enabled: id !== null,
  });
