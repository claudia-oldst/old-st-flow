import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { PROJECT_ROLES, type ProjectRole } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MemberAvatar } from "@/components/MemberAvatar";
import { AvatarCropDialog } from "./AvatarCropDialog";
import { useAvatarPicker } from "./useAvatarPicker";
import { removeAvatar } from "./uploadAvatar";

export function MyProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user, setUser } = useCurrentUser();
  const [name, setName] = useState("");
  const [role, setRole] = useState<ProjectRole>("Fullstack");
  const [github, setGithub] = useState("");
  const [saving, setSaving] = useState(false);
  const picker = useAvatarPicker();

  useEffect(() => {
    if (open && user) { setName(user.name); setRole(user.role); setGithub(user.github_username ?? ""); }
  }, [open, user]);

  if (!user) return null;
  const isPmba = user.role === "PMBA";
  const roles = PROJECT_ROLES.filter((r) => isPmba || r !== "PMBA");

  const save = async () => {
    if (!name.trim()) return toast.error("Name can't be empty");
    setSaving(true);
    const { data, error } = await supabase.from("team_members")
      .update({ name: name.trim(), role, github_username: github.trim() || null })
      .eq("id", user.id).select("*").single();
    setSaving(false);
    if (error) return toast.error(error.code === "23505" ? "That GitHub account is linked to someone else." : error.message);
    setUser(data);
    toast.success("Profile saved");
    onOpenChange(false);
  };

  const clearPhoto = async () => {
    try { setUser(await removeAvatar(user.id, user.avatar_url)); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>My profile</DialogTitle>
            <DialogDescription>{user.email}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4">
            <MemberAvatar name={user.name} memberId={user.id} color={user.avatar_color} size="xl" />
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" onClick={picker.pick} className="gap-2">
                <Camera className="h-3.5 w-3.5" />{user.avatar_url ? "Change photo" : "Add photo"}
              </Button>
              {user.avatar_url && (
                <Button size="sm" variant="ghost" onClick={clearPhoto} className="gap-2 text-muted-foreground">
                  <Trash2 className="h-3.5 w-3.5" />Remove
                </Button>
              )}
            </div>
            <input ref={picker.inputRef} type="file" accept="image/*" hidden onChange={picker.onFile} />
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="pf-name">Name</Label>
              <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
            <div className="space-y-1.5"><Label>Team role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as ProjectRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label htmlFor="pf-gh">GitHub username</Label>
              <Input id="pf-gh" value={github} onChange={(e) => setGithub(e.target.value)} maxLength={39} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AvatarCropDialog src={picker.src} onCancel={picker.cancel} onCropped={picker.onCropped} />
    </>
  );
}
