"use client";
import { actOnWorkflowRun, videoWorkflowKeys } from "@/api/video-workflow";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useWorkflowRunAction = () => { const client = useAppQueryClient(); return useMutation({ mutationFn: actOnWorkflowRun, onSuccess: run => { client.setQueryData(videoWorkflowKeys.run(run.id), run); void client.invalidateQueries({ queryKey: videoWorkflowKeys.videos(run.id) }); } }); };
