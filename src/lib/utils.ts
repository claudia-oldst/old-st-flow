import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatHours(h: number) {
  if (!h || h <= 0) return "0h";
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(h % 1 === 0 ? 0 : 1)}h`;
}

export function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function healthRatio(actual: number, estimate: number): "good" | "warn" | "bad" | "none" {
  if (!estimate || estimate <= 0) return actual > 0 ? "warn" : "none";
  const r = actual / estimate;
  if (r >= 1) return "bad";
  if (r >= 0.8) return "warn";
  return "good";
}

export function displayTitle(title: string, type: string) {
  if (type === "Bug") return `[BUG] ${title}`;
  if (type === "CR") return `[CR] ${title}`;
  // "Proj" tickets use the title as-is.
  return title;
}

/**
 * Shared page-shell width: grows in steps on wider monitors so content gets
 * more room without stretching individual components. Use on the outer
 * container of pages and the top bar so they align horizontally.
 */
export const PAGE_SHELL =
  "mx-auto w-full max-w-[1480px] 2xl:max-w-[1640px] min-[1800px]:max-w-[1760px] min-[2000px]:max-w-[1920px] px-4 sm:px-6 2xl:px-8";
