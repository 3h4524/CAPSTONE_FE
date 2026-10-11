"use client";

import { getWorkflow, workflowKeys } from "@/api/workflows";
import { useQuery } from "@/hooks/queries/use-query";

export const useWorkflow = (id: string | null) =>
  useQuery({
    queryKey: workflowKeys.detail(id ?? "pending"),
    queryFn: () => getWorkflow(id ?? ""),
    enabled: Boolean(id),
    suppressErrorToast: true,
  });
