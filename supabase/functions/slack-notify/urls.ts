/** Keep ordinary ticket links on Details; discussion alerts open Discussion. */
export function urls(base: string | null, projectId: string, ticketId: string) {
  if (!base) return { project: null, ticket: null, discussion: null, changeRequests: null };
  const b = base.replace(/\/+$/, "");
  const ticket = `${b}/projects/${projectId}?ticket=${ticketId}`;
  return {
    project: `${b}/projects/${projectId}`,
    ticket,
    discussion: `${ticket}&tab=discussion`,
    changeRequests: `${b}/projects/${projectId}/change-requests`,
  };
}