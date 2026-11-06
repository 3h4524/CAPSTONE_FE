import { adminImageQualityKeys, getAdminImageQualityLive } from "@/api/admin-image-quality";
import { useQuery } from "@/hooks/queries/use-query";
import type { ImageQualityLiveFilter } from "@/types/admin-image-quality";

export const useAdminImageQualityLive = (filter: ImageQualityLiveFilter) =>
  useQuery({
    queryKey: adminImageQualityKeys.live(filter),
    queryFn: () => getAdminImageQualityLive(filter),
  });
