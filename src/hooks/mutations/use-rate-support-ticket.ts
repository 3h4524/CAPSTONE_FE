"use client";

import { rateSupportTicket, supportTicketKeys } from "@/api/support-tickets";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useRateSupportTicket = (ticketId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rateSupportTicket,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supportTicketKeys.detail(ticketId) }),
        queryClient.invalidateQueries({ queryKey: supportTicketKeys.all }),
      ]);
      showToast("success", "Thanks for rating your support experience.");
    },
  });
};
