"use client";

import { createWorkflow, workflowKeys } from "@/api/workflows";
import { sortWorkflowSummaries, toWorkflowSummary } from "@/helpers/workflow-graph";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { SaveWorkflowInput, WorkflowDetail, WorkflowSummary } from "@/types/workflow";

export const useCreateWorkflow = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: (input: SaveWorkflowInput) => createWorkflow(input),
    onSuccess: (workflow) => {
      queryClient.setQueryData<WorkflowDetail>(workflowKeys.detail(workflow.id), workflow);
      queryClient.setQueryData<WorkflowSummary[]>(workflowKeys.list(), (previous) =>
        sortWorkflowSummaries([...(previous ?? []), toWorkflowSummary(workflow)])
      );
    },
  });
};
