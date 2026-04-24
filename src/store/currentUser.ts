import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamMember } from "@/lib/types";

interface CurrentUserState {
  user: TeamMember | null;
  setUser: (user: TeamMember | null) => void;
}

export const useCurrentUser = create<CurrentUserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    { name: "ost-current-user" }
  )
);
