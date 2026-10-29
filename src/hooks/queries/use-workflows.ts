"use client";

import { listWorkflows, workflowKeys } from "@/api/workflows";
import { useQuery } from "@/hooks/queries/use-query";

export const useWorkflows = () =>
  useQuery({
    queryKey: workflowKeys.list(),
    queryFn: () => listWorkflows(),
    suppressErrorToast: true,
  });
