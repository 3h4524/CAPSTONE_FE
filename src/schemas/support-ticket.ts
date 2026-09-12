import { z } from "zod";

import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES } from "@/constants/support";

const categoryValues = SUPPORT_CATEGORIES.map((item) => item.value);
const priorityValues = SUPPORT_PRIORITIES.map((item) => item.value);

export const createSupportTicketSchema = z.object({
  subject: z.string().trim().min(3, "Enter a short subject (at least 3 characters).").max(200),
  category: z.string().refine((value) => categoryValues.includes(value as never), "Select a category."),
  priority: z.string().refine((value) => priorityValues.includes(value as never), "Select a priority."),
  description: z.string().trim().min(10, "Add a little more detail (at least 10 characters).").max(5000),
});

export const replySupportTicketSchema = z.object({
  replyText: z.string().trim().min(1, "Write a message before sending.").max(5000),
});

export type CreateSupportTicketFormValues = z.infer<typeof createSupportTicketSchema>;
export type ReplySupportTicketFormValues = z.infer<typeof replySupportTicketSchema>;
