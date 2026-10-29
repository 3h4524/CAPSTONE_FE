"use client";
import { generateLifestyleMockup, videoWorkflowKeys } from "@/api/video-workflow";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { MockupAsset } from "@/types/video-workflow";

export const useGenerateLifestyleMockup = () => { const client = useAppQueryClient(); return useMutation({ mutationFn: generateLifestyleMockup, onSuccess: asset => client.setQueryData<MockupAsset[]>(videoWorkflowKeys.assets(asset.productId), old => [asset, ...(old ?? [])]) }); };
