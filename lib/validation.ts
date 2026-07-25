import { z } from "zod";

export const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name is too long"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address"),
  budget: z.enum(["UNDER_1K", "ONE_TO_5K", "FIVE_TO_15K", "ABOVE_15K"], {
    message: "Select a budget range",
  }),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message is too long"),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const BUDGET_LABELS: Record<string, string> = {
  UNDER_1K: "Under $1,000",
  ONE_TO_5K: "$1,000 - $5,000",
  FIVE_TO_15K: "$5,000 - $15,000",
  ABOVE_15K: "$15,000+",
};