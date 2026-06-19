import { useCallback, useEffect, useState } from "react";
import type { ColKey } from "./list/columns";

export type ColumnDisplayPrefs = Partial<Record<ColKey, boolean>>;

// Columns the user can toggle. `title` is always shown and intentionally omitted.
export const TOGGLEABLE_COLS: { key: ColKey; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "epic", label: "Epic" },
  { key: "version", label: "Version" },
  { key: "status", label: "Status" },
  { key: "dev_status", label: "Dev status" },
  { key: "fe", label: "FE hours" },
  { key: "be", label: "BE hours" },
  { key: "assignees", label: "Assignees" },
  { key: "fe_pool", label: "FE Sprint" },
  { key: "be_pool", label: "BE Sprint" },
];

export const DEFAULT_COLUMN_PREFS: ColumnDisplayPrefs = Object.fromEntries(
  TOGGLEABLE_COLS.map((c) => [c.key, true]),
) as ColumnDisplayPrefs;

export function isAllColsOn(p: ColumnDisplayPrefs): boolean {
  return TOGGLEABLE_COLS.every((c) => p[c.key] !== false);
}

const STORAGE_KEY = "tickets-list-col-display-v1";

function read(): ColumnDisplayPrefs {
  if (typeof window === "undefined") return DEFAULT_COLUMN_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COLUMN_PREFS;
    return { ...DEFAULT_COLUMN_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_COLUMN_PREFS;
  }
}

let current: ColumnDisplayPrefs =
  typeof window === "undefined" ? DEFAULT_COLUMN_PREFS : read();
const listeners = new Set<(p: ColumnDisplayPrefs) => void>();

function setShared(next: ColumnDisplayPrefs) {
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(current));
}

export function useColumnDisplayPrefs() {
  const [prefs, setPrefsState] = useState<ColumnDisplayPrefs>(current);

  useEffect(() => {
    const onLocal = (p: ColumnDisplayPrefs) => setPrefsState(p);
    listeners.add(onLocal);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        current = read();
        listeners.forEach((l) => l(current));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(onLocal);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setPrefs = useCallback((next: ColumnDisplayPrefs) => setShared(next), []);
  const reset = useCallback(() => setShared(DEFAULT_COLUMN_PREFS), []);

  return { prefs, setPrefs, reset };
}
