import { z } from "zod";

export const MAX_PROJECT_NAME = 120;
export const MAX_CLIENT_NAME = 120;
export const MAX_LINK_NAME = 60;
export const MAX_LINKS = 30;

export const projectLinkSchema = z.object({
  name: z
    .string()
    .trim()
    .max(MAX_LINK_NAME, `Link name must be ${MAX_LINK_NAME} characters or fewer`),
  url: z.string().trim().url("Each link must have a valid URL"),
});

export const projectDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(MAX_PROJECT_NAME, `Project name must be ${MAX_PROJECT_NAME} characters or fewer`),
  acronym: z
    .string()
    .trim()
    .max(6, "Acronym must be 6 characters or fewer"),
  client_name: z
    .string()
    .trim()
    .max(MAX_CLIENT_NAME, `Client name must be ${MAX_CLIENT_NAME} characters or fewer`)
    .optional()
    .nullable(),
  rate_per_hour: z
    .number({ invalid_type_error: "Rate must be a number" })
    .min(0, "Rate must be a positive number"),
  start_date: z.string().nullable().optional(),
  links: z
    .array(projectLinkSchema)
    .max(MAX_LINKS, `Max ${MAX_LINKS} links per project`),
});

export type ProjectDetailsInput = z.infer<typeof projectDetailsSchema>;
