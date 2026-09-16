"use client";

import { getSupportTicket, supportTicketKeys } from "@/api/support-tickets";
import { useQuery } from "@/hooks/queries/use-query";

const terminalStatuses = new Set(["resolved", "closed"]);

export const useSupportTicket = (id: string | null) =>
  useQuery({
    queryKey: supportTicketKeys.detail(id ?? "closed"),
    queryFn: () => getSupportTicket(id as string),
    enabled: Boolean(id),
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      if (typeof document !== "undefined" && document.hidden) {
        return false;
      }
      const status = query.state.data?.status;
      return status && terminalStatuses.has(status) ? false : 30_000;
    },
  });
