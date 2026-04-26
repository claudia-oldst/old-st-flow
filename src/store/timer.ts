import { create } from "zustand";
import type { ActiveTimer } from "@/lib/types";

export interface TimerTicket {
  id: string;
  formatted_id: string;
  title: string;
  position: number;
  fe_status: "todo" | "in_progress" | "done";
  be_status: "todo" | "in_progress" | "done";
  status_id: string | null;
  project_id: string;
}

interface TimerState {
  active: ActiveTimer | null;
  tickets: TimerTicket[];
  setActive: (t: ActiveTimer | null) => void;
  setTickets: (tickets: TimerTicket[]) => void;
}

export const useTimerStore = create<TimerState>((set) => ({
  active: null,
  tickets: [],
  setActive: (active) => set({ active }),
  setTickets: (tickets) => set({ tickets }),
}));
