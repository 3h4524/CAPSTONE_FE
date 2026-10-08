"use client";
import { listMockupAssets, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";

export const useMockupAssets = (productId: string) => useQuery({ queryKey: videoWorkflowKeys.assets(productId), queryFn: () => listMockupAssets(productId), enabled: Boolean(productId), staleTime: 30_000, refetchInterval: 8 * 60_000 });
