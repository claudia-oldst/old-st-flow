/**
 * Generate a 16-char URL-safe hash for the client portal link.
 * Uses crypto.getRandomValues so it works in both browser and jsdom.
 */
export function makeHash(): string {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
