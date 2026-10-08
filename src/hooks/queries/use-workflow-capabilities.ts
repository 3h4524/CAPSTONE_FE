"use client";
import { getWorkflowCapabilities, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";

export const useWorkflowCapabilities = () => useQuery({ queryKey: videoWorkflowKeys.capabilities(), queryFn: getWorkflowCapabilities, staleTime: 60_000 });
