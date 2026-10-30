"use client";

import { useEffect } from "react";

import { Log } from "@/helpers/log";
import { adminTestReportKeys } from "@/hooks/queries/use-admin-test-reports";
import type { HubConnection } from "@microsoft/signalr";
import { HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";

let sharedConnection: HubConnection | null = null;
let connectionCount = 0;

export function useTestReportEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const applyChange = () => {
      queryClient.invalidateQueries({ queryKey: adminTestReportKeys.all });
    };

    connectionCount += 1;
    let isMounted = true;

    const connect = async () => {
      if (!sharedConnection) {
        sharedConnection = new HubConnectionBuilder()
          .withUrl(`${process.env.NEXT_PUBLIC_API_BASE_URL}/hubs/notification`, {
            withCredentials: true,
          })
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Warning)
          .build();

        sharedConnection.on("TestReportRunChanged", applyChange);
      }

      try {
        if (sharedConnection.state === HubConnectionState.Disconnected) {
          await sharedConnection.start();
        }
        if (isMounted) {
          applyChange();
        }
      } catch (error) {
        Log.warn({
          prefix: "test-report-events",
          message: "The live run stream did not start yet",
          data: error,
        });
        sharedConnection.onreconnected(() => {
          if (isMounted) {
            applyChange();
          }
        });
      }
    };

    void connect();

    return () => {
      isMounted = false;
      connectionCount -= 1;

      if (connectionCount === 0 && sharedConnection) {
        sharedConnection.off("TestReportRunChanged", applyChange);
        void sharedConnection.stop();
        sharedConnection = null;
      }
    };
  }, [queryClient]);
}
