import { useCallback, useEffect, useState } from "react";

export interface CardDisplayPrefs {
  id: boolean;
  type: boolean;
  chips: boolean;
  bars: boolean;
  assignees: boolean;
  projBadge: boolean;
}

export const DEFAULT_CARD_PREFS: CardDisplayPrefs = {
  id: true,
  type: true,
  chips: true,
  bars: true,
  assignees: true,
  projBadge: true,
};

const STORAGE_KEY = "card-display-prefs-v1";

function read(): CardDisplayPrefs {
  if (typeof window === "undefined") return DEFAULT_CARD_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CARD_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CARD_PREFS, ...parsed };
  } catch {
    return DEFAULT_CARD_PREFS;
  }
}

export function isAllOn(p: CardDisplayPrefs): boolean {
  return (
    p.id && p.type && p.chips && p.bars && p.assignees && p.projBadge
  );
}

export function useCardDisplayPrefs() {
  const [prefs, setPrefsState] = useState<CardDisplayPrefs>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPrefsState(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPrefs = useCallback((next: CardDisplayPrefs) => {
    setPrefsState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const reset = useCallback(() => setPrefs(DEFAULT_CARD_PREFS), [setPrefs]);

  return { prefs, setPrefs, reset };
}
