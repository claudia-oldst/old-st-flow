import { useState } from "react";
import { Settings, Users, Layers, GitBranch } from "lucide-react";
import { useCurrentUser } from "@/store/currentUser";
import StatusRulesAdmin from "@/features/admin/StatusRulesAdmin";
import { TeamAdmin } from "@/features/admin/TeamAdmin";
import { StatusesAdmin } from "@/features/admin/StatusesAdmin";

export default function Admin() {
  const user = useCurrentUser((s) => s.user);
  const isPMBA = user?.role === "PMBA";
  const [tab, setTab] = useState<"team" | "statuses" | "rules">("team");
  return (
    <div className="mx-auto max-w-[1480px] px-4 sm:px-6 py-10">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-dimmer mb-2">Workspace</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Settings className="h-7 w-7" /> Admin
        </h1>
      </div>

      <div className="flex gap-1 hairline-b mb-6">
        <TabButton active={tab === "team"} onClick={() => setTab("team")} icon={<Users className="h-3.5 w-3.5" />}>
          Team members
        </TabButton>
        <TabButton active={tab === "statuses"} onClick={() => setTab("statuses")} icon={<Layers className="h-3.5 w-3.5" />}>
          Statuses
        </TabButton>
        {isPMBA && (
          <TabButton active={tab === "rules"} onClick={() => setTab("rules")} icon={<GitBranch className="h-3.5 w-3.5" />}>
            Status rules
          </TabButton>
        )}
      </div>

      {tab === "team" && <TeamAdmin />}
      {tab === "statuses" && <StatusesAdmin />}
      {tab === "rules" && isPMBA && <StatusRulesAdmin canEdit={isPMBA} />}
    </div>
  );
}

function TabButton({
  active, onClick, icon, children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm transition relative inline-flex items-center gap-1.5 ${
        active ? "text-foreground" : "text-dim hover:text-foreground"
      }`}
    >
      {icon}
      {children}
      {active && <span className="absolute left-2 right-2 -bottom-px h-px bg-foreground" />}
    </button>
  );
}
