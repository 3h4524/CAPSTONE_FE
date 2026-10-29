"use client";
import { uploadMockupAsset, videoWorkflowKeys } from "@/api/video-workflow";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { MockupAsset } from "@/types/video-workflow";

export const useUploadMockupAsset = () => { const client = useAppQueryClient(); return useMutation({ mutationFn: uploadMockupAsset, onSuccess: asset => client.setQueryData<MockupAsset[]>(videoWorkflowKeys.assets(asset.productId), old => [asset, ...(old ?? [])]) }); };
