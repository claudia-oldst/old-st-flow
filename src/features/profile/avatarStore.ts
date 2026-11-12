import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

/** Signed avatar URLs keyed by team member id and by name (fallback for callers without an id). */
interface AvatarState {
  byId: Record<string, string>;
  byName: Record<string, string>;
  loaded: boolean;
  load: (force?: boolean) => Promise<void>;
}

let inflight: Promise<void> | null = null;

export const useAvatarStore = create<AvatarState>()((set, get) => ({
  byId: {},
  byName: {},
  loaded: false,
  load: async (force = false) => {
    if (inflight) return inflight;
    if (get().loaded && !force) return;
    inflight = (async () => {
      const { data } = await supabase
        .from("team_members")
        .select("id, name, avatar_url")
        .not("avatar_url", "is", null);
      const rows = (data ?? []).filter((r) => r.avatar_url);
      const byId: Record<string, string> = {};
      const byName: Record<string, string> = {};
      if (rows.length) {
        const { data: signed } = await supabase.storage
          .from("avatars")
          .createSignedUrls(rows.map((r) => r.avatar_url as string), 60 * 60 * 24 * 7);
        signed?.forEach((s, i) => {
          if (!s.signedUrl) return;
          byId[rows[i].id] = s.signedUrl;
          byName[rows[i].name] = s.signedUrl;
        });
      }
      set({ byId, byName, loaded: true });
    })().finally(() => { inflight = null; });
    return inflight;
  },
}));

export function useAvatarUrl(name: string, memberId?: string): string | undefined {
  const url = useAvatarStore((s) => (memberId && s.byId[memberId]) || s.byName[name]);
  const loaded = useAvatarStore((s) => s.loaded);
  if (!loaded) void useAvatarStore.getState().load();
  return url;
}
