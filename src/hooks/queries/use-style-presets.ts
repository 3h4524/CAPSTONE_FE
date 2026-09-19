"use client";

import { listStyleArtPresets, stylePresetKeys } from "@/api/style-presets";
import { useQuery } from "@/hooks/queries/use-query";

export const useStylePresets = (open = true) =>
  useQuery({
    queryKey: stylePresetKeys.list(),
    queryFn: () => listStyleArtPresets(),
    enabled: open,
    staleTime: 5 * 60_000,
    suppressErrorToast: true,
  });
