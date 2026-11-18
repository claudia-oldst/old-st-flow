import { useEffect, useState } from "react";

/** Per-tab hidden column keys, remembered in this browser. */
export function useHiddenColumns(storageKey: string) {
  const [hidden, setHidden] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "[]"); } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(hidden)); } catch { /* ignore */ }
  }, [storageKey, hidden]);
  return [hidden, setHidden] as const;
}

export interface ReviewColumn { key: string; label: string; align?: "left" | "right"; locked?: boolean }

/** 1-based positions of hidden columns, for the card's nth-child hiding. */
export const hiddenPositions = (cols: ReviewColumn[], hidden: string[]) =>
  cols.map((c, i) => (!c.locked && hidden.includes(c.key) ? i + 1 : 0)).filter(Boolean);

export const columnHeaders = (cols: ReviewColumn[]) =>
  cols.map((c, i) => (
    <th key={c.key}
      className={`${c.align === "right" ? "text-right" : "text-left"} font-medium ${i === 0 || i === cols.length - 1 ? "px-3" : "px-2"} py-2`}>
      {c.label}
    </th>
  ));
