import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface Ctx {
  selected: Set<string>;
  toggle: (ticketId: string) => void;
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

  const clear = useCallback(() => setSelected(new Set()), []);
  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const value = useMemo<Ctx>(
    () => ({ selected, toggle, clear, isSelected }),
    [selected, toggle, clear, isSelected],
  );

  return <SprintSelectionCtx.Provider value={value}>{children}</SprintSelectionCtx.Provider>;
}

export function useSprintSelection(): Ctx {
  const ctx = useContext(SprintSelectionCtx);
  if (!ctx) {
    // Safe fallback for cards rendered outside the workbench
    return {
      selected: new Set<string>(),
      toggle: () => {},
      clear: () => {},
      isSelected: () => false,
    };
  }
  return ctx;
}
