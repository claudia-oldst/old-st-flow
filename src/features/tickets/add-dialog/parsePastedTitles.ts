import { MAX_TICKET_TITLE } from "@/lib/schemas/ticket";

/**
 * Parses pasted text (one ticket per line) into titles.
 * - Splits on newlines, trims, drops blank lines.
 * - Multi-column Excel/Sheets copies: only the first tab-separated cell is used.
 * - Titles are clamped to the ticket title length limit.
 */
export function parsePastedTitles(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split("\t")[0].trim())
    .filter((line) => line.length > 0)
    .map((line) => (line.length > MAX_TICKET_TITLE ? line.slice(0, MAX_TICKET_TITLE) : line));
}

export function countDuplicates(titles: string[]): number {
  const seen = new Set<string>();
  let dupes = 0;
  for (const t of titles) {
    const key = t.toLowerCase();
    if (seen.has(key)) dupes += 1;
    else seen.add(key);
  }
  return dupes;
}
