"use client";

import { listStyleArtPresets, stylePresetKeys } from "@/api/style-presets";
import { useQuery } from "@/hooks/queries/use-query";

export const useStylePresets = (enabled = true) =>
  useQuery({
    queryKey: stylePresetKeys.list(),
    queryFn: () => listStyleArtPresets(),
    enabled,
    staleTime: 5 * 60_000,
    suppressErrorToast: true,
  });
