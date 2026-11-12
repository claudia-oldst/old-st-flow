import { supabase } from "@/integrations/supabase/client";
import type { TeamMember } from "@/lib/types";
import { useAvatarStore } from "./avatarStore";

export async function uploadAvatar(memberId: string, blob: Blob): Promise<TeamMember> {
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${memberId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: blob.type, cacheControl: "604800" });
  if (error) throw error;
  const { data: prev } = await supabase.from("team_members").select("avatar_url").eq("id", memberId).single();
  const { data, error: e2 } = await supabase.from("team_members").update({ avatar_url: path }).eq("id", memberId).select("*").single();
  if (e2) throw e2;
  if (prev?.avatar_url && prev.avatar_url !== path) await supabase.storage.from("avatars").remove([prev.avatar_url]);
  await useAvatarStore.getState().load(true);
  return data;
}

export async function removeAvatar(memberId: string, path: string | null): Promise<TeamMember> {
  const { data, error } = await supabase.from("team_members").update({ avatar_url: null }).eq("id", memberId).select("*").single();
  if (error) throw error;
  if (path) await supabase.storage.from("avatars").remove([path]);
  await useAvatarStore.getState().load(true);
  return data;
}
