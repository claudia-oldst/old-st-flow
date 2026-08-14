/** Shared helpers for the Health tab's "Version" multi-select filter. */

export const NO_VERSION_KEY = "_none";

/** Normalise a raw ticket version into a stable filter key. */
export function versionKeyOf(version: string | null | undefined): string {
  const v = typeof version === "string" ? version.trim() : "";
  return v ? v : NO_VERSION_KEY;
}

/**
 * Build the option list (sorted, "No version" last) from a list of raw
 * ticket versions.
 */
export function versionOptions(versions: Array<string | null | undefined>) {
  const keys = new Set<string>();
  versions.forEach((v) => keys.add(versionKeyOf(v)));
  const named = Array.from(keys)
    .filter((k) => k !== NO_VERSION_KEY)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
    .map((k) => ({ value: k, label: k }));
  if (keys.has(NO_VERSION_KEY)) named.push({ value: NO_VERSION_KEY, label: "No version" });
  return named;
}

/** True when the selection means "everything" (no filtering needed). */
export function isAllVersions(selected: string[], total: number) {
  return selected.length === 0 || selected.length >= total;
}
