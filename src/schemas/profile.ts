import { z } from "zod";

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Full name is too long"),
  email: z.email("Please enter a valid email address").max(254, "Email is too long"),
  shopName: z.string().max(100, "Shop name is too long"),
  shopDescription: z.string().max(100, "Shop description is too long"),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
