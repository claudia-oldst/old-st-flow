import { useEffect, useRef, useState } from "react";

/**
 * useState that persists to sessionStorage, so values survive
 * browser-tab switches, background tab unloads, and reloads
 * within the same session. Scope keys by entity id (e.g. projectId)
 * when state should not leak across siblings.
 */
export function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
  options?: { storage?: "session" | "local" },
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const storage =
    typeof window === "undefined"
      ? null
      : options?.storage === "local"
        ? window.localStorage
        : window.sessionStorage;

  const [value, setValue] = useState<T>(() => {
    if (storage) {
      try {
        const raw = storage.getItem(key);
        if (raw !== null) return JSON.parse(raw) as T;
      } catch {
        /* ignore corrupt entries */
      }
    }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  // If the key changes, re-hydrate from storage (or fall back to initial).
  const lastKey = useRef(key);
  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    if (!storage) return;
    try {
      const raw = storage.getItem(key);
      setValue(
        raw !== null
          ? (JSON.parse(raw) as T)
          : typeof initial === "function"
            ? (initial as () => T)()
            : initial,
      );
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota or serialization error – ignore */
    }
  }, [key, value, storage]);

  return [value, setValue];
}
