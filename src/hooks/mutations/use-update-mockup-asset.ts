"use client";
import { updateMockupAsset, videoWorkflowKeys } from "@/api/video-workflow";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { MockupAsset } from "@/types/video-workflow";

export const useUpdateMockupAsset = () => { const client = useAppQueryClient(); return useMutation({ mutationFn: updateMockupAsset, onSuccess: asset => client.setQueryData<MockupAsset[]>(videoWorkflowKeys.assets(asset.productId), old => old?.map(x => x.id === asset.id ? asset : x)) }); };
