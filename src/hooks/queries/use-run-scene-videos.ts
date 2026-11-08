"use client";

import { useEffect } from "react";

import { listRunSceneVideos, videoWorkflowKeys } from "@/api/video-workflow";
import { useQuery } from "@/hooks/queries/use-query";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";

export const useRunSceneVideos = (runId: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!runId) return;

    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const connection = new HubConnectionBuilder()
      .withUrl(`${process.env.NEXT_PUBLIC_API_BASE_URL}/hubs/workflow`, { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();
    const refresh = () => {
      if (active) void queryClient.invalidateQueries({ queryKey: videoWorkflowKeys.sceneVideos(runId) });
    };
    const join = async () => {
      await connection.invoke("JoinWorkflow", runId);
      // Fetch after joining to cover changes between the initial request and subscription.
      refresh();
    };
    const scheduleRetry = () => {
      if (active && !retryTimer) retryTimer = setTimeout(() => {
        retryTimer = undefined;
        void start();
      }, 5_000);
    };
    const start = async () => {
      try {
        await connection.start();
        if (active) await join();
      } catch {
        if (active) {
          await connection.stop();
          scheduleRetry();
        }
      }
    };

    connection.on("SceneVideosChanged", (changedRunId: string) => {
      if (changedRunId.toLowerCase() === runId.toLowerCase()) refresh();
    });
    connection.onreconnected(() => {
      void join().catch(async () => {
        await connection.stop();
        scheduleRetry();
      });
    });
    connection.onclose(scheduleRetry);
    void start();

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      void connection.stop();
    };
  }, [queryClient, runId]);

  return useQuery({
    queryKey: videoWorkflowKeys.sceneVideos(runId),
    queryFn: () => listRunSceneVideos(runId!),
    enabled: Boolean(runId),
    staleTime: 1_000,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
};
