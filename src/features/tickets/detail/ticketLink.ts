export function ticketUrl(origin: string, projectId: string, ticketId: string) {
  return `${origin.replace(/\/+$/, "")}/projects/${projectId}?ticket=${ticketId}`;
}

export function ticketLabel(formattedId: string, title: string) {
  return `${formattedId} — ${title}`;
}

const escHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function ticketLinkHtml(url: string, label: string) {
  return `<a href="${escHtml(url)}">${escHtml(label)}</a>`;
}
