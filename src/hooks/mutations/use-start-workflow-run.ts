"use client";
import { startWorkflowRun, videoWorkflowKeys } from "@/api/video-workflow";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useStartWorkflowRun = () => { const client = useAppQueryClient(); return useMutation({ mutationFn: startWorkflowRun, onSuccess: run => client.setQueryData(videoWorkflowKeys.run(run.id), run) }); };
