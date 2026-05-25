import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/store/currentUser";

/**
 * Restricts a route to users with the global PMBA role.
 * Non-PMBA signed-in users are redirected to `/`.
 * Assumes it sits inside <RequireAuth>, so `user` is already populated.
 */
export function RequirePMBA({ children }: { children: ReactNode }) {
  const user = useCurrentUser((s) => s.user);
  if (!user) return null;
  if (user.role !== "PMBA") return <Navigate to="/" replace />;
  return <>{children}</>;
}
