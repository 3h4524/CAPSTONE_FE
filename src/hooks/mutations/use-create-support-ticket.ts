"use client";

import { createSupportTicket, supportTicketKeys } from "@/api/support-tickets";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useCreateSupportTicket = (onCreated: (id: string) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSupportTicket,
    onSuccess: async (ticket) => {
      await queryClient.invalidateQueries({ queryKey: supportTicketKeys.all });
      showToast("success", `${ticket.ticketNumber} was submitted.`);
      onCreated(ticket.id);
    },
  });
};
