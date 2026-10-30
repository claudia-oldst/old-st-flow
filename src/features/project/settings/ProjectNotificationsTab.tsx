import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Bell, Hash } from "lucide-react";
import type { ProjectMember, TeamMember } from "@/lib/types";

interface Props {
  members: (ProjectMember & { member: TeamMember })[];
  currentUserId: string | undefined;
  canEditAll: boolean;
  isEnabled: (userId: string) => boolean;
  onToggle: (userId: string, enabled: boolean) => void;
  slackChannelId: string | null;
  onSaveChannel: (channelId: string | null) => void;
}

export function ProjectNotificationsTab({
  members, currentUserId, canEditAll, isEnabled, onToggle, slackChannelId, onSaveChannel,
}: Props) {
  const [channel, setChannel] = useState(slackChannelId ?? "");
  useEffect(() => setChannel(slackChannelId ?? ""), [slackChannelId]);
  const dirty = channel.trim() !== (slackChannelId ?? "");

  return (
    <div className="space-y-4 mt-4">
      <div className="glass rounded-xl p-4 space-y-2">
        <div className="text-sm font-medium flex items-center gap-2">
          <Hash className="h-4 w-4 text-dim" /> Feedback Slack channel
        </div>
        <p className="text-xs text-dimmer">
          New Thalamus feedback for this project is posted to this Slack channel, with a
          link to the feedback ticket for discussion. Paste the channel ID (right-click the
          channel in Slack → View channel details → scroll to the bottom). Leave empty to
          disable.
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="e.g. C0123456789"
            disabled={!canEditAll}
            className="font-mono text-sm"
            aria-label="Feedback Slack channel ID"
          />
          <Button
            size="sm"
            disabled={!canEditAll || !dirty}
            onClick={() => onSaveChannel(channel.trim() || null)}
          >
            Save
          </Button>
        </div>
      </div>

      <div className="text-dim text-sm flex items-start gap-2">
        <Bell className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Slack DM nudges for this project: ticket assignments, and estimate revision
          requests awaiting approval (PMBAs only). Everyone is opted in by default.
        </span>
      </div>

      <div className="glass rounded-xl divide-y divide-border/40">
        {members.length === 0 && (
          <div className="p-4 text-sm text-dimmer">No members on this project yet.</div>
        )}
        {members.map((pm) => {
          const editable = canEditAll || pm.user_id === currentUserId;
          return (
            <div key={pm.user_id} className="flex items-center gap-3 p-3">
              <MemberAvatar name={pm.member?.name ?? "?"} color={pm.member?.avatar_color} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{pm.member?.name}</div>
                <div className="text-xs text-dimmer truncate">{pm.role}</div>
              </div>
              <Switch
                checked={isEnabled(pm.user_id)}
                disabled={!editable}
                onCheckedChange={(v) => onToggle(pm.user_id, v)}
                aria-label={`Slack nudges for ${pm.member?.name}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
