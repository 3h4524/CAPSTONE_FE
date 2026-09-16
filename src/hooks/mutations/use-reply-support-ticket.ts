"use client";

import { replySupportTicket, supportTicketKeys } from "@/api/support-tickets";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useReplySupportTicket = (ticketId: string, onSent: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: replySupportTicket,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supportTicketKeys.detail(ticketId) }),
        queryClient.invalidateQueries({ queryKey: supportTicketKeys.all }),
      ]);
      showToast("success", "Your reply was sent.");
      onSent();
    },
  });
};
