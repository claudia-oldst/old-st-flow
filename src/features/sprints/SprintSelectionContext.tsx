import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type SelectionSource = "pool" | "dev" | null;

interface Ctx {
  selected: Set<string>;
  source: SelectionSource;
  /** Toggle a single ticket. If `source` is passed and differs, clears first. */
  toggle: (ticketId: string, source?: SelectionSource) => void;
  /** Bulk select/deselect ids. If `source` is passed and differs, clears first. */
  setMany: (ticketIds: string[], select: boolean, source?: SelectionSource) => void;
  clear: () => void;
  isSelected: (ticketId: string) => boolean;
}

const SprintSelectionCtx = createContext<Ctx | null>(null);

export function SprintSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [source, setSource] = useState<SelectionSource>(null);

  const toggle = useCallback((ticketId: string, nextSource?: SelectionSource) => {
    setSelected((prev) => {
      // If switching source, reset before adding.
      let base = prev;
      if (nextSource && source && nextSource !== source) {
        base = new Set();
      }
      const next = new Set(base);
      if (next.has(ticketId)) next.delete(ticketId);
      else next.add(ticketId);
      if (next.size === 0) setSource(null);
      else if (nextSource) setSource(nextSource);
      return next;
    });
  }, [source]);

  const setMany = useCallback((ticketIds: string[], select: boolean, nextSource?: SelectionSource) => {
    setSelected((prev) => {
      let base = prev;
      if (select && nextSource && source && nextSource !== source) {
        base = new Set();
      }
      const next = new Set(base);
      ticketIds.forEach((id) => (select ? next.add(id) : next.delete(id)));
      if (next.size === 0) setSource(null);
      else if (select && nextSource) setSource(nextSource);
      return next;
    });
  }, [source]);

  const clear = useCallback(() => {
    setSelected(new Set());
    setSource(null);
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const value = useMemo<Ctx>(
    () => ({ selected, source, toggle, setMany, clear, isSelected }),
    [selected, source, toggle, setMany, clear, isSelected],
  );

  return <SprintSelectionCtx.Provider value={value}>{children}</SprintSelectionCtx.Provider>;
}

export function useSprintSelection(): Ctx {
  const ctx = useContext(SprintSelectionCtx);
  if (!ctx) {
    return {
      selected: new Set<string>(),
      source: null,
      toggle: () => {},
      setMany: () => {},
      clear: () => {},
      isSelected: () => false,
    };
  }
  return ctx;
}
