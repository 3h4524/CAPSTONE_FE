"use client";

import { adminStyleArtPresetKeys, getAdminStyleArtPresets } from "@/api/admin-style-art-presets";
import { useQuery } from "@/hooks/queries/use-query";

export const useAdminStyleArtPresets = (enabled = true) =>
  useQuery({
    queryKey: adminStyleArtPresetKeys.list(),
    queryFn: () => getAdminStyleArtPresets(),
    enabled,
    staleTime: 5 * 60_000,
    refetchInterval: (query) => (query.state.data?.some((preset) => preset.viStatus === "pending") ? 5_000 : false),
    suppressErrorToast: true,
  });
