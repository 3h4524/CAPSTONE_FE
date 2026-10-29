"use client";

import { deleteWorkflow, workflowKeys } from "@/api/workflows";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { WorkflowSummary } from "@/types/workflow";

export const useDeleteWorkflow = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) => deleteWorkflow(id, revision),
    onSuccess: (_, { id }) => {
      queryClient.setQueryData<WorkflowSummary[]>(workflowKeys.list(), (previous) =>
        (previous ?? []).filter((item) => item.id !== id)
      );
      queryClient.removeQueries({ queryKey: workflowKeys.detail(id) });
    },
  });
};
