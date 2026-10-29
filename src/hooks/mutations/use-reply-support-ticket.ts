"use client";

import { replySupportTicket, supportTicketKeys } from "@/api/support-tickets";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useReplySupportTicket = (ticketId: string, onSent: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: replySupportTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.detail(ticketId) });
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.all });
      onSent();
    },
  });
};
