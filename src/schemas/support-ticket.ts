import { z } from "zod";

import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES } from "@/constants/support";
import { i18n } from "@/i18n/client";

const categoryValues = SUPPORT_CATEGORIES.map((item) => item.value);
const priorityValues = SUPPORT_PRIORITIES.map((item) => item.value);

export const createSupportTicketSchema = z.object({
  subject: z.string().trim().min(3, { error: () => i18n.t("support.schema.subjectMin") }).max(200),
  category: z.string().refine((value) => categoryValues.includes(value as never), { error: () => i18n.t("support.schema.categorySelect") }),
  priority: z.string().refine((value) => priorityValues.includes(value as never), { error: () => i18n.t("support.schema.prioritySelect") }),
  description: z.string().trim().min(10, { error: () => i18n.t("support.schema.descriptionMin") }).max(5000),
});

export const replySupportTicketSchema = z.object({
  replyText: z.string().trim().max(5000),
});

export type CreateSupportTicketFormValues = z.infer<typeof createSupportTicketSchema>;
export type ReplySupportTicketFormValues = z.infer<typeof replySupportTicketSchema>;
