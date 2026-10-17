"use client";

import { listRunSceneVideos, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";

const FINISHED_SCENE_STATUSES = ["stored", "failed"];

export const useRunSceneVideos = (runId: string | null) => useQuery({
  queryKey: videoWorkflowKeys.sceneVideos(runId),
  queryFn: () => listRunSceneVideos(runId!),
  enabled: Boolean(runId),
  staleTime: 1_000,
  refetchInterval: query => {
    const clips = query.state.data;
    return clips?.length && clips.every(clip => FINISHED_SCENE_STATUSES.includes(clip.status)) ? false : 2_000;
  },
});
