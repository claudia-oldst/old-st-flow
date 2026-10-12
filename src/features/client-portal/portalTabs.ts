/** Client portal tabs, shared by the public portal and the editor preview. */
export const PORTAL_TABS = ["timeline", "summary", "billing", "change-requests"] as const;
export type PortalTab = (typeof PORTAL_TABS)[number];

/** Unknown or missing values fall back to the first tab. */
export function parsePortalTab(value: string | null | undefined): PortalTab {
  return (PORTAL_TABS as readonly string[]).includes(value ?? "") ? (value as PortalTab) : "timeline";
}

/** Public portal URL that opens on the given tab (timeline = no param). */
export function portalLink(origin: string, hash: string, tab: PortalTab): string {
  return `${origin}/h/${hash}${tab === "timeline" ? "" : `?tab=${tab}`}`;
}
