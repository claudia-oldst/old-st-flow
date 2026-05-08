import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCRDeciderNames(deciderIds: string[]) {
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = Array.from(new Set(deciderIds)).filter((id) => !(id in memberNames));
    if (ids.length === 0) return;
    let cancelled = false;
    supabase
      .from("team_members")
      .select("id,name")
      .in("id", ids)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setMemberNames((prev) => {
          const next = { ...prev };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.forEach((m: any) => { next[m.id] = m.name; });
          return next;
        });
      });
    return () => { cancelled = true; };
  }, [deciderIds, memberNames]);

  return memberNames;
}
