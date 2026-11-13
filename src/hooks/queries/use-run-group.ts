"use client";

import { useSearchParams } from "next/navigation";

import { getRunGroup, runGroupKeys } from "@/api/run-groups";
import { RUN_GROUP_PARAM } from "@/constants/run-group";
import { useQuery } from "@/hooks/queries/use-query";
import { useRunGroupLive } from "@/stores/run-group-live";
import type { RunGroup } from "@/types/video-workflow";

export const ACTIVE_RUN_GROUP_STATUSES: RunGroup["status"][] = ["waiting_for_targets", "running"];

/** Polling while the hub is down; with the hub connected, changes arrive as events. */
const FALLBACK_POLL_MS = 15_000;

export const useRunGroupId = () => useSearchParams().get(RUN_GROUP_PARAM);

export const useRunGroup = (groupId: string | null) => {
  const live = useRunGroupLive((state) => Boolean(groupId) && state.connectedGroupId === groupId);
  return useQuery({
    queryKey: runGroupKeys.detail(groupId),
    queryFn: () => getRunGroup(groupId!),
    enabled: Boolean(groupId),
    staleTime: 0,
    refetchInterval: (query) =>
      !live && query.state.data && ACTIVE_RUN_GROUP_STATUSES.includes(query.state.data.status) ? FALLBACK_POLL_MS : false,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
};
