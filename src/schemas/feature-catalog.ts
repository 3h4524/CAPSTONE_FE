import { z } from "zod";

// Matches UpdateFeatureRequestDtoValidator and the features columns on the backend.
export const featureFormSchema = z.object({
  label: z.string().trim().min(1, "Enter a label.").max(120, "Keep the label under 120 characters."),
  description: z.string().trim().max(500, "Keep the description under 500 characters."),
  group: z.string().trim().min(1, "Enter a group.").max(60, "Keep the group under 60 characters."),
  unit: z.string().trim().max(40, "Keep the unit under 40 characters."),
  // Empty means no limit.
  defaultLimit: z
    .number({ message: "Enter a whole number, or leave it empty for no limit." })
    .int("Enter a whole number.")
    .min(0, "The default must be 0 or greater.")
    .max(10_000, "The default must be 10,000 or less.")
    .nullable(),
  sortOrder: z
    .number({ message: "Enter a position." })
    .int("Enter a whole number.")
    .min(0, "The position must be 0 or greater.")
    .max(10_000, "The position must be 10,000 or less."),
  trialAvailable: z.boolean(),
  isActive: z.boolean(),
});

export type FeatureFormValues = z.infer<typeof featureFormSchema>;
