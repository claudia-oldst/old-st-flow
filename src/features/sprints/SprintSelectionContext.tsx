import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface Ctx {
  selected: Set<string>;
  toggle: (ticketId: string) => void;
  setMany: (ticketIds: string[], select: boolean) => void;
  clear: () => void;
  isSelected: (ticketId: string) => boolean;
}

const SprintSelectionCtx = createContext<Ctx | null>(null);

export function SprintSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((ticketId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ticketId)) next.delete(ticketId);
      else next.add(ticketId);
      return next;
    });
  }, []);

  const setMany = useCallback((ticketIds: string[], select: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      ticketIds.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);
  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const value = useMemo<Ctx>(
    () => ({ selected, toggle, setMany, clear, isSelected }),
    [selected, toggle, setMany, clear, isSelected],
  );

  return <SprintSelectionCtx.Provider value={value}>{children}</SprintSelectionCtx.Provider>;
}

export function useSprintSelection(): Ctx {
  const ctx = useContext(SprintSelectionCtx);
  if (!ctx) {
    return {
      selected: new Set<string>(),
      toggle: () => {},
      setMany: () => {},
      clear: () => {},
      isSelected: () => false,
    };
  }
  return ctx;
}
