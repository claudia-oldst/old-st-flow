import { MemberAvatarStack } from "@/components/MemberAvatar";
import type { TicketRow } from "@/features/tickets/useProjectTickets";

type Member = TicketRow["assignees"][number]["member"];

function Group({ label, members }: { label: string; members: Member[] }) {
  if (members.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      <span>{label}</span>
      <MemberAvatarStack
        members={members.map((m) => ({ id: m.id, name: m.name, avatar_color: m.avatar_color }))}
        size="xs"
        max={3}
      />
    </div>
  );
}

/** Capped avatar stacks per assignee slot, wrapping to avoid card overruns. */
export function CardAssignees({
  isProj,
  fe,
  be,
  team,
}: {
  isProj: boolean;
  fe: Member[];
  be: Member[];
  team: Member[];
}) {
  const empty = fe.length === 0 && be.length === 0 && team.length === 0;
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-dimmer">
        {isProj ? (
          team.length > 0 ? (
            <Group label="Team" members={team} />
          ) : (
            <span>Unassigned</span>
          )
        ) : (
          <>
            <Group label="FE" members={fe} />
            <Group label="BE" members={be} />
            <Group label="P" members={team} />
            {empty && <span>Unassigned</span>}
          </>
        )}
      </div>
    </div>
  );
}
