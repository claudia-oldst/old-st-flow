import { supabase } from "@/integrations/supabase/client";

/**
 * Post a comment on the parent ticket announcing that a bug was logged
 * against it, with a clickable link back to the bug ticket.
 *
 * The link uses the in-app `#open-ticket:<uuid>` href which the comment
 * renderer turns into an event that opens the target ticket in the sheet.
 */
export async function postBugLinkComment(opts: {
  parentTicketId: string;
  bugTicketId: string;
  bugFormattedId: string;
  bugTitle: string;
  userId: string;
}) {
  const body =
    `🐞 Bug ticket logged on this ticket: ` +
    `[${opts.bugFormattedId} — ${opts.bugTitle}](#open-ticket:${opts.bugTicketId})`;
  await supabase.from("ticket_comments").insert({
    ticket_id: opts.parentTicketId,
    user_id: opts.userId,
    parent_id: null,
    body,
    attachments: [],
  });
}
