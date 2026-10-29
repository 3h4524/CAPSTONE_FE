"use client";

import { updateWorkflow, workflowKeys } from "@/api/workflows";
import { sortWorkflowSummaries, toWorkflowSummary } from "@/helpers/workflow-graph";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { SaveWorkflowInput, WorkflowDetail, WorkflowSummary } from "@/types/workflow";

type UpdateWorkflowVariables = {
  id: string;
  input: SaveWorkflowInput;
};

export const useUpdateWorkflow = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: UpdateWorkflowVariables) => updateWorkflow(id, input),
    onSuccess: (workflow) => {
      queryClient.setQueryData<WorkflowDetail>(workflowKeys.detail(workflow.id), workflow);
      queryClient.setQueryData<WorkflowSummary[]>(workflowKeys.list(), (previous) =>
        sortWorkflowSummaries(
          (previous ?? []).map((item) => (item.id === workflow.id ? toWorkflowSummary(workflow) : item))
        )
      );
    },
  });
};
