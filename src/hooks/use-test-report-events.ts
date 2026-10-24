"use client";

import { useEffect } from "react";

import { adminTestReportKeys } from "@/hooks/queries/use-admin-test-reports";
import type { HubConnection} from "@microsoft/signalr";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";

let sharedConnection: HubConnection | null = null;
let connectionCount = 0;

export function useTestReportEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const applyChange = () => {
      queryClient.invalidateQueries({ queryKey: adminTestReportKeys.all });
    };

    connectionCount++;
    let mounted = true;

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
        if (sharedConnection.state === "Disconnected") {
          await sharedConnection.start();
        }
        if (mounted) {
          applyChange();
        }
      } catch {
        const reconnect = () => {
          if (mounted) {
            applyChange();
          }
        };
        sharedConnection.onreconnected(reconnect);
      }
    };

    void connect();

    return () => {
      mounted = false;
      connectionCount -= 1;

      if (connectionCount === 0 && sharedConnection) {
        sharedConnection.off("TestReportRunChanged", applyChange);
        void sharedConnection.stop();
        sharedConnection = null;
      }
    };
  }, [queryClient]);
}
