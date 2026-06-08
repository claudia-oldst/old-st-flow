import { useCallback, useEffect, useState } from "react";

export interface CardDisplayPrefs {
  id: boolean;
  type: boolean;
  chips: boolean;
  bars: boolean;
  assignees: boolean;
  projBadge: boolean;
  status: boolean;
}

export const DEFAULT_CARD_PREFS: CardDisplayPrefs = {
  id: true,
  type: true,
  chips: true,
  bars: true,
  assignees: true,
  projBadge: true,
  status: true,
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
  return p.id && p.type && p.chips && p.bars && p.assignees && p.projBadge && p.status;
}

// Module-level shared state so every `useCardDisplayPrefs()` consumer in the
// same tab stays in sync instantly (the `storage` event only fires across tabs).
let current: CardDisplayPrefs =
  typeof window === "undefined" ? DEFAULT_CARD_PREFS : read();
const listeners = new Set<(p: CardDisplayPrefs) => void>();

function setShared(next: CardDisplayPrefs) {
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(current));
}

export function useCardDisplayPrefs() {
  const [prefs, setPrefsState] = useState<CardDisplayPrefs>(current);

  useEffect(() => {
    const onLocal = (p: CardDisplayPrefs) => setPrefsState(p);
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

  const setPrefs = useCallback((next: CardDisplayPrefs) => setShared(next), []);
  const reset = useCallback(() => setShared(DEFAULT_CARD_PREFS), []);

  return { prefs, setPrefs, reset };
}
