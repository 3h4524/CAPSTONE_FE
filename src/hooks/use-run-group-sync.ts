"use client";

import { useEffect } from "react";

import { runGroupKeys } from "@/api/run-groups";
import { videoWorkflowKeys } from "@/api/video-workflow";
import { useRunGroupLive } from "@/stores/run-group-live";
import type { RunGroup, WorkflowRun } from "@/types/video-workflow";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";

type RunChanged = { runId: string; groupId: string | null; status: string; revision: number };
type RunProgress = { runId: string; groupId: string | null; stage: string; progress: number };

const same = (left: string | null | undefined, right: string | null | undefined) =>
  Boolean(left && right) && left!.toLowerCase() === right!.toLowerCase();

/**
 * Follows a batch video run over the workflow hub, so neither the group nor its runs are polled. A change of a run
 * reloads that run and the group; progress is written straight into both, without asking the server. Mounted once.
 */
export const useRunGroupSync = (groupId: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) return;

    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let groupTimer: ReturnType<typeof setTimeout> | undefined;
    const setConnected = useRunGroupLive.getState().setConnectedGroupId;
    const connection = new HubConnectionBuilder()
      .withUrl(`${process.env.NEXT_PUBLIC_API_BASE_URL}/hubs/workflow`, { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    // Several runs often change together (a confirm queues them all): one reload of the group covers them.
    const refreshGroup = () => {
      if (!active || groupTimer) return;
      groupTimer = setTimeout(() => {
        groupTimer = undefined;
        if (active) void queryClient.invalidateQueries({ queryKey: runGroupKeys.detail(groupId) });
      }, 300);
    };
    const join = async () => {
      await connection.invoke("JoinRunGroup", groupId);
      if (!active) return;
      setConnected(groupId);
      // Read once after joining: whatever changed before the subscription is not lost.
      void queryClient.invalidateQueries({ queryKey: runGroupKeys.detail(groupId) });
    };
    const disconnected = () => {
      if (useRunGroupLive.getState().connectedGroupId === groupId) setConnected(null);
    };
    const scheduleRetry = () => {
      disconnected();
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

    connection.on("RunGroupChanged", (change: { groupId: string }) => {
      if (same(change.groupId, groupId)) refreshGroup();
    });
    connection.on("RunChanged", (change: RunChanged) => {
      if (!same(change.groupId, groupId)) return;
      refreshGroup();
      void queryClient.invalidateQueries({ queryKey: videoWorkflowKeys.run(change.runId) });
      void queryClient.invalidateQueries({ queryKey: videoWorkflowKeys.videos(change.runId) });
    });
    connection.on("RunProgress", (change: RunProgress) => {
      if (!same(change.groupId, groupId)) return;
      queryClient.setQueryData<RunGroup>(runGroupKeys.detail(groupId), (group) =>
        group && {
          ...group,
          targets: group.targets.map((target) =>
            same(target.runId, change.runId) ? { ...target, stage: change.stage, progress: change.progress } : target
          ),
        }
      );
      queryClient.setQueryData<WorkflowRun>(videoWorkflowKeys.run(change.runId), (run) =>
        run && {
          ...run,
          nodes: run.nodes.map((node) =>
            node.status === "running" ? { ...node, stage: change.stage, progress: change.progress } : node
          ),
        }
      );
    });
    connection.onreconnecting(disconnected);
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
      if (groupTimer) clearTimeout(groupTimer);
      disconnected();
      void connection.stop();
    };
  }, [queryClient, groupId]);
};
