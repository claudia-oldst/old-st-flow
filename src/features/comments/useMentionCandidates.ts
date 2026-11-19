import { activeRows, isActiveMember } from "@/lib/activeMembers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MentionCandidate {
  id: string;
  name: string;
  avatar_color: string;
}

/** Project members available to @mention in a discussion. */
export function useMentionCandidates(projectId: string | undefined) {
  const query = useQuery({
    queryKey: ["mentionCandidates", projectId],
    enabled: !!projectId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<MentionCandidate[]> => {
      const { data } = await supabase
        .from("project_members")
        .select("user_id, team_members(id, name, avatar_color, is_active)")
        .eq("project_id", projectId!);
      return ((data as unknown as { team_members: MentionCandidate | null }[]) ?? [])
        .map((r) => r.team_members)
        .filter((m): m is MentionCandidate => isActiveMember(m as { is_active?: boolean }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  return query.data ?? [];
}
