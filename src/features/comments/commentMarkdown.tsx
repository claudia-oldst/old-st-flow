import { emitOpenTicket } from "@/features/tickets/openTicketEvent";

const OPEN_TICKET_HREF = /^#open-ticket:([0-9a-f-]{36})$/i;
const MENTION_HREF = /^mention:([0-9a-f-]{36})$/i;


export function relTime(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const markdownComponents = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: ({ href, children, ...rest }: any) => {
    const href_ = typeof href === "string" ? href : "";
    if (MENTION_HREF.test(href_)) {
      return (
        <span className="rounded px-1 py-0.5 bg-primary/15 text-primary font-medium">
          {children}
        </span>
      );
    }
    const m = href_.match(OPEN_TICKET_HREF);

    if (m) {
      const id = m[1];
      return (
        <button
          type="button"
          className="text-primary underline-offset-2 hover:underline font-mono"
          onClick={(e) => {
            e.preventDefault();
            emitOpenTicket(id);
          }}
        >
          {children}
        </button>
      );
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" {...rest}>
        {children}
      </a>
    );
  },
};
