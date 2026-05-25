import { create } from "zustand";
import type { TeamMember } from "@/lib/types";

interface CurrentUserState {
  user: TeamMember | null;
  setUser: (user: TeamMember | null) => void;
}

export const useCurrentUser = create<CurrentUserState>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
