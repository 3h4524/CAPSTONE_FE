import { z } from "zod";

export const referrerLoginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type ReferrerLoginFormValues = z.infer<typeof referrerLoginSchema>;
