import {
  replyAdminSupportTicket,
  updateAdminSupportTicketStatus,
} from "@/api/admin-support";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { adminSupportTicketsKeys } from "@/hooks/queries/use-admin-support-tickets";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type {
  SupportTicketDetail,
  SupportTicketReply,
  TicketStatus,
} from "@/types/support";

type ReplyAdminTicketParams = {
  id: string;
  replyText: string;
  isInternalNote: boolean;
  attachments?: File[];
};

export const useReplyAdminTicket = () => {
  const queryClient = useAppQueryClient();

  return useMutation<SupportTicketReply, ReplyAdminTicketParams>({
    mutationFn: replyAdminSupportTicket,
    onSuccess: (_, variables) => {
      // Invalidate the detail query so the new reply is fetched immediately
      queryClient.invalidateQueries({
        queryKey: adminSupportTicketsKeys.detail(variables.id),
      });
      // Invalidate the list queries because the ticket's "UpdatedAt" likely changed
      queryClient.invalidateQueries({
        queryKey: adminSupportTicketsKeys.lists(),
      });
    },
  });
};

type UpdateAdminTicketStatusParams = {
  id: string;
  status: TicketStatus;
};

export const useUpdateAdminTicketStatus = () => {
  const queryClient = useAppQueryClient();

  return useMutation<SupportTicketDetail, UpdateAdminTicketStatusParams>({
    mutationFn: updateAdminSupportTicketStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminSupportTicketsKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: adminSupportTicketsKeys.lists(),
      });
    },
  });
};
