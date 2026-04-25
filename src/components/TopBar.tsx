import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { useTimerStore } from "@/store/timer";
import type { TeamMember } from "@/lib/types";
import { MemberAvatar } from "@/components/MemberAvatar";
import oldStLogo from "@/assets/oldst-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Settings, FolderKanban, ListChecks, User, Square } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { toast } from "sonner";

function TimerChip() {
  const active = useTimerStore((s) => s.active);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  const elapsed = now - new Date(active.started_at).getTime();

  const handleStop = async () => {
    const hours = elapsed / 1000 / 3600;
    if (hours < 1 / 60) {
      // less than a minute, just discard
      await supabase.from("active_timers").delete().eq("user_id", active.user_id);
      toast.info("Timer discarded (under a minute).");
      return;
    }
    const { error: logErr } = await supabase.from("time_logs").insert({
      ticket_id: active.ticket_id,
      user_id: active.user_id,
      discipline: active.discipline,
      hours: Math.round(hours * 100) / 100,
      source: "timer",
    });
    if (logErr) {
      toast.error("Failed to save time: " + logErr.message);
      return;
    }
    await supabase.from("active_timers").delete().eq("user_id", active.user_id);
    toast.success(`Logged ${(Math.round(hours * 100) / 100).toFixed(2)}h`);
  };

  return (
    <button
      onClick={handleStop}
      className="group inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1.5 text-sm hairline hover:bg-accent/25 transition"
      title="Stop timer and log hours"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-pulse-soft rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      <span className="font-mono ticker">{formatDuration(elapsed)}</span>
      <Square className="h-3 w-3 opacity-60 group-hover:opacity-100" />
    </button>
  );
}

function UserPicker() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const { user, setUser } = useCurrentUser();

  useEffect(() => {
    supabase
      .from("team_members")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) {
          setMembers(data);
          if (!user && data.length) setUser(data[0]);
        }
      });
  }, [user, setUser]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 hairline hover:bg-white/5 transition">
        {user ? (
          <>
            <MemberAvatar name={user.name} color={user.avatar_color} size="xs" />
            <span className="text-sm">{user.name}</span>
          </>
        ) : (
          <>
            <User className="h-4 w-4" />
            <span className="text-sm">Pick user</span>
          </>
        )}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 glass-strong">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-dimmer">
          Switch user (v1)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {members.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => setUser(m)}
            className="gap-2"
          >
            <MemberAvatar name={m.name} color={m.avatar_color} size="xs" />
            <span>{m.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopBar() {
  const location = useLocation();

  const navItems = [
    { to: "/", label: "Projects", icon: FolderKanban },
    { to: "/my-work", label: "My Work", icon: ListChecks },
    { to: "/admin", label: "Admin", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 hairline-b backdrop-blur-xl bg-background/80">
      <div className="mx-auto max-w-[1480px] px-4 sm:px-6 h-14 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src={oldStLogo}
            alt="Old St Labs"
            className="h-7 w-auto select-none"
            draggable={false}
          />
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              item.to === "/"
                ? location.pathname === "/" || location.pathname.startsWith("/projects")
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition",
                  isActive
                    ? "bg-white/10 text-foreground"
                    : "text-dim hover:text-foreground hover:bg-white/5"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <TimerChip />
          <UserPicker />
        </div>
      </div>
    </header>
  );
}
