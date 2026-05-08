import { z } from "zod";

export const MAX_TICKET_TITLE = 200;
export const MAX_TICKET_DESCRIPTION = 10_000;
export const MAX_TICKET_VERSION = 50;
export const MAX_TICKET_HOURS = 9999;

const hours = z
  .number({ invalid_type_error: "Hours must be a number" })
  .min(0, "Hours cannot be negative")
  .max(MAX_TICKET_HOURS, `Hours cannot exceed ${MAX_TICKET_HOURS}`);

export const ticketInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(MAX_TICKET_TITLE, `Title must be ${MAX_TICKET_TITLE} characters or fewer`),
  description: z
    .string()
    .max(MAX_TICKET_DESCRIPTION, `Description too long (max ${MAX_TICKET_DESCRIPTION})`)
    .optional()
    .nullable(),
  version: z
    .string()
    .max(MAX_TICKET_VERSION, `Version must be ${MAX_TICKET_VERSION} characters or fewer`)
    .optional()
    .nullable(),
  fe_estimate: hours.optional(),
  be_estimate: hours.optional(),
  project_estimate: hours.optional(),
  ticket_type: z.enum(["Standard", "Bug", "CR", "Proj"]),
  epic_id: z.number().int().nullable().optional(),
});

export type TicketInput = z.infer<typeof ticketInputSchema>;
