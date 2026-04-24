import { create } from "zustand";
import type { ActiveTimer } from "@/lib/types";

interface TimerState {
  active: ActiveTimer | null;
  setActive: (t: ActiveTimer | null) => void;
}

export const useTimerStore = create<TimerState>((set) => ({
  active: null,
  setActive: (active) => set({ active }),
}));
