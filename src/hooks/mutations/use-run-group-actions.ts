"use client";

import {
  cancelRunGroup,
  confirmRunGroup,
  runGroupKeys,
  startRunGroup,
  updateRunGroupDesignConfig,
  updateRunGroupOverride,
} from "@/api/run-groups";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { RunGroup } from "@/types/video-workflow";

const useStoreGroup = () => {
  const client = useAppQueryClient();
  return (group: RunGroup) => {
    client.setQueryData(runGroupKeys.detail(group.id), group);
    void client.invalidateQueries({ queryKey: runGroupKeys.list(group.workflowId) });
  };
};

export const useStartRunGroup = () => {
  const store = useStoreGroup();
  return useMutation({ mutationFn: startRunGroup, onSuccess: store });
};

export const useConfirmRunGroup = () => {
  const store = useStoreGroup();
  return useMutation({ mutationFn: confirmRunGroup, onSuccess: store });
};

export const useCancelRunGroup = () => {
  const store = useStoreGroup();
  return useMutation({ mutationFn: cancelRunGroup, onSuccess: store });
};

export const useUpdateRunGroupDesignConfig = () => {
  const store = useStoreGroup();
  return useMutation({ mutationFn: updateRunGroupDesignConfig, onSuccess: store });
};

export const useUpdateRunGroupOverride = () => {
  const store = useStoreGroup();
  return useMutation({ mutationFn: updateRunGroupOverride, onSuccess: store });
};
