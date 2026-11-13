import type { EmailFacts } from "../../../../supabase/functions/_shared/clientEmail";

export interface EmailText {
  epics: { name: string; summary: string }[];
  bugs: string;
  changeRequests: string;
  discounts: string;
}
export interface EmailInput {
  facts: EmailFacts;
  text: EmailText;
  projectName: string;
  sender: string;
  asOf: Date;
  portalUrl: string | null;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const hrs = (n: number) => `${Number(n.toFixed(1))} ${n === 1 ? "hour" : "hours"}`;
export const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
export const monthLabel = (d: Date) =>
  d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/** Builds the email as HTML (for rich copy) and plain text. */
export function buildEmail(i: EmailInput): { html: string; text: string } {
  const { facts: f, text: t } = i;
  const monthYear = monthLabel(i.asOf);
  const month = i.asOf.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  const summaries = new Map(t.epics.map((e) => [e.name, e.summary]));
  const intro = f.hasOtherEpics
    ? `the team logged ${hrs(f.totalHours)} across several areas, with the main focus on the following:`
    : `the team logged ${hrs(f.totalHours)}, made up of the following:`;
  // Each part: [html, text]
  const parts: [string, string][] = [
    ["Hi,", "Hi,"],
    [
      `Please see the report for ${esc(i.projectName)} for ${monthYear}. For the month of ${month}, ${intro}`,
      `Please see the report for ${i.projectName} for ${monthYear}. For the month of ${month}, ${intro}`,
    ],
  ];
  if (f.topEpics.length) {
    const items = f.topEpics.map((e) => [e.name, hrs(e.hours), summaries.get(e.name) ?? ""] as const);
    parts.push([
      `<ul>${items.map(([n, h, s]) => `<li><b>${esc(n)}</b> (${h})${s ? ` – ${esc(s)}` : ""}</li>`).join("")}</ul>`,
      items.map(([n, h, s]) => `- ${n} (${h})${s ? ` – ${s}` : ""}`).join("\n"),
    ]);
  }
  const para = (s: string) => parts.push([esc(s), s]);
  if (f.bugHours > 0) para(`${t.bugs} In total, ${hrs(f.bugHours)} were logged on bug tickets.`.trim());
  if (f.crHours > 0) para(`${t.changeRequests} In total, ${hrs(f.crHours)} were logged on change requests.`.trim());
  if (f.discountHours > 0) {
    const list = f.discounts.map((d) => `${d.epic} (${hrs(d.hours)})`).join(", ");
    para(`This month, ${hrs(f.discountHours)} were discounted on ${list}. ${t.discounts}`.trim());
  }
  if (i.portalUrl) {
    parts.push([
      `You can view more detail on <a href="${esc(i.portalUrl)}">this link</a>.`,
      `You can view more detail on this link: ${i.portalUrl}`,
    ]);
  }
  para(`In summary, ${hrs(f.totalHours)} were logged in ${month}, bringing the amount due to ${gbp(f.amountOwed)}.`);
  para("If you have any questions or encounter any issues, please don’t hesitate to reach out. Thank you very much!");
  parts.push([`Regards,<br>${esc(i.sender)}`, `Regards,\n${i.sender}`]);
  return {
    html: parts.map(([h]) => (h.startsWith("<ul>") ? h : `<p>${h}</p>`)).join(""),
    text: parts.map(([, x]) => x).join("\n\n"),
  };
}
