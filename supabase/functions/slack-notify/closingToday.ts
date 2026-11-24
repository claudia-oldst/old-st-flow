/** Client-ready message Operations sends on the day a bug-fixing window closes. */
export function formatClosingDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).replace(",", "");
}

export function closingDayEmail(projectName: string, date: string, opsName: string) {
  const subject = `${projectName}: Bug-fixing window closure`;
  const body = [
    "Hi,",
    `I’m writing to confirm that our support window for ${projectName} ends today, ${date}.`,
    "All feedback tickets raised have been addressed and deployed to Production, so there are no pending tickets remaining on our side.",
    "We’d also love to set up a short meeting to catch up soon. Could you let us know what days and times work best for you, and we’ll send over an invite?",
    `Best,\n${opsName}`,
  ].join("\n\n");
  return { subject, body };
}
