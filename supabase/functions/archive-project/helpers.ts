/**
 * Pure helpers used by archive-project. Kept in a separate module so they
 * can be unit-tested without triggering the top-level `Deno.serve` in index.ts.
 */

/**
 * Produce a safe, filesystem-friendly "{slug}-{YYYY-MM-DD}" basename for archive files.
 * Prefers the project name, falls back to acronym, then to a static "project".
 */
export function buildArchiveBasename(
  name: string | null | undefined,
  acronym: string | null | undefined,
  dateISO: string,
): string {
  const raw = String(name ?? acronym ?? "project");
  const slug =
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "project";
  const date = dateISO.slice(0, 10);
  return `${slug}-${date}`;
}
