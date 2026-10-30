import { z } from "npm:zod@3";

export const Body = z.object({
  id: z.string().min(1).max(100),
  project_id: z.string().uuid("project_id must be the project UUID from the Pulse URL"),
  acronym: z.string().min(1).max(20),
  type: z.string().optional().nullable(),
  title: z.string().max(500).optional().nullable(),
  screenshot: z.object({ url: z.string().url().nullable().optional() }).partial().optional().nullable(),
  recording: z.object({
    url: z.string().url().refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname.endsWith(".supabase.co") &&
        !url.username && !url.password && !url.port &&
        url.pathname.startsWith("/storage/v1/object/sign/");
    }, "recording.url must be a signed Supabase storage HTTPS URL"),
  }).optional().nullable(),
}).passthrough();