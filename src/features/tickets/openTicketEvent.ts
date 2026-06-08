// Cross-component bridge for opening a ticket by id from within a detail
// sheet (e.g. clicking the parent ticket badge, or a link in a comment).
export const OPEN_TICKET_EVENT = "oldst:open-ticket";

export function emitOpenTicket(ticketId: string) {
  window.dispatchEvent(new CustomEvent(OPEN_TICKET_EVENT, { detail: ticketId }));
}
