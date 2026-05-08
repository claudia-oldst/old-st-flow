import { z } from "zod";

export const MAX_PORTAL_SUMMARY = 5000;

export const epicSummarySchema = z.object({
  text: z
    .string()
    .max(MAX_PORTAL_SUMMARY, `Summary must be ${MAX_PORTAL_SUMMARY} characters or fewer`),
  included: z.boolean(),
});

export type EpicSummaryInput = z.infer<typeof epicSummarySchema>;
