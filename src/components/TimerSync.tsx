import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { useTimerStore } from "@/store/timer";

export function TimerSync() {
  const user = useCurrentUser((s) => s.user);
  const setActive = useTimerStore((s) => s.setActive);

  useEffect(() => {
    if (!user) {
      setActive(null);
      return;
    }

    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("active_timers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (mounted) setActive(data ?? null);
    };
    load();

    const channel = supabase
      .channel(`active-timer-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "active_timers", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, setActive]);

  return null;
}
