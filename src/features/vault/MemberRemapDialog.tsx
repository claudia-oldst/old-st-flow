import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/MemberAvatar";
import type { TeamMember } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingUserIds: string[];
  onConfirm: (map: Record<string, string>) => void;
}

const FORMER = "__former__";

export function MemberRemapDialog({ open, onOpenChange, missingUserIds, onConfirm }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setMap({});
    supabase.from("team_members").select("*").order("name").then(({ data }) => {
      setMembers(data ?? []);
    });
  }, [open]);

  const handleConfirm = async () => {
    const finalMap: Record<string, string> = {};
    for (const id of missingUserIds) {
      const choice = map[id] ?? FORMER;
      if (choice === FORMER) {
        // Create a per-original-id placeholder team member, reuse if exists
        const { data: existing } = await supabase
          .from("team_members")
          .select("id")
          .eq("email", `former+${id}@vault.local`)
          .maybeSingle();
        if (existing?.id) {
          finalMap[id] = existing.id;
        } else {
          const { data: created, error } = await supabase
            .from("team_members")
            .insert({
              name: "Former Member",
              email: `former+${id}@vault.local`,
              role: "Fullstack",
              avatar_color: "#64748b",
            })
            .select("id")
            .single();
          if (error || !created) return;
          finalMap[id] = created.id;
        }
      } else {
        finalMap[id] = choice;
      }
    }
    onConfirm(finalMap);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Remap missing members</DialogTitle>
          <DialogDescription>
            These users existed when the project was archived but no longer match a team
            member. Pick a replacement, or use a "Former Member" placeholder.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-[50vh] overflow-y-auto">
          {missingUserIds.map((id) => (
            <div key={id} className="flex items-center gap-3">
              <code className="text-[10px] text-dimmer flex-1 truncate" title={id}>
                {id.slice(0, 8)}…
              </code>
              <Select
                value={map[id] ?? FORMER}
                onValueChange={(v) => setMap((m) => ({ ...m, [id]: v }))}
              >
                <SelectTrigger className="w-[260px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FORMER}>Former Member (placeholder)</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="inline-flex items-center gap-2">
                        <MemberAvatar name={m.name} color={m.avatar_color} size="sm" />
                        {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Restore project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
