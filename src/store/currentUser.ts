import { create } from "zustand";
import type { TeamMember } from "@/lib/types";

interface CurrentUserState {
  user: TeamMember | null;
  authLoading: boolean;
  authError: string | null;
  setUser: (user: TeamMember | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
}

export const useCurrentUser = create<CurrentUserState>()((set) => ({
  user: null,
  authLoading: true,
  authError: null,
  setUser: (user) => set({ user }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setAuthError: (authError) => set({ authError }),
}));
